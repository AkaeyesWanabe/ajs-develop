const fs = nw.require('fs');
const $ = nw.require('jquery');
const globals = nw.require('./assets/js/common/globals');
const application = nw.require('./assets/js/objects/application');


module.exports = {
    animatorData: {},

    cache: {
        animatorPath: "",
        curAnimationId: -2,
        curFrameId: -2,
        imagePickerPath: "",
        // Multi-selection support
        selectedFrames: [],      // Array of selected frame indices
        selectedImages: [],      // Array of selected image paths
        lastSelectedFrame: -1,   // For shift+click range selection
    },

    // Clipboard for copy/paste
    clipboard: {
        frames: [],              // Copied frames data
        type: null               // 'frames' or null
    },

    // Track if there are unsaved changes
    isDirty: false,

    // Store event listeners to clean them up later (prevent memory leaks)
    _eventListeners: [],

    // Track if point input handlers are attached (attach only once)
    _pointInputHandlersAttached: false,

    // Store original values for undo/redo
    _pointInputOriginalValues: {},

    // Undo/Redo system
    commandHistory: {
        undoStack: [],
        redoStack: [],
        maxHistorySize: 50,
        isExecuting: false  // Prevent recording during undo/redo
    },

    /**
     * Removes all stored event listeners to prevent memory leaks
     */
    _cleanupEventListeners() {
        this._eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this._eventListeners = [];

        // NOTE: We do NOT reset _pointInputHandlersAttached here because
        // the handlers on #afpbPoints (sidebar) should only be attached ONCE
        // and never cleaned up. _cleanupEventListeners is only for visual point
        // handlers on #aibPoints (draggable points).

        // Only clear original values
        this._pointInputOriginalValues = {};
    },

    // ============================================
    // EASING FUNCTIONS FOR TWEENING
    // ============================================

    /**
     * Easing functions for smooth interpolation between frames
     * @param {number} t - Progress value between 0 and 1
     * @returns {number} Eased value between 0 and 1
     */
    easingFunctions: {
        // No easing
        linear: (t) => t,

        // Quadratic easing
        easeInQuad: (t) => t * t,
        easeOutQuad: (t) => t * (2 - t),
        easeInOutQuad: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,

        // Cubic easing
        easeInCubic: (t) => t * t * t,
        easeOutCubic: (t) => (--t) * t * t + 1,
        easeInOutCubic: (t) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,

        // Quartic easing
        easeInQuart: (t) => t * t * t * t,
        easeOutQuart: (t) => 1 - (--t) * t * t * t,
        easeInOutQuart: (t) => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,

        // Quintic easing
        easeInQuint: (t) => t * t * t * t * t,
        easeOutQuint: (t) => 1 + (--t) * t * t * t * t,
        easeInOutQuint: (t) => t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * (--t) * t * t * t * t,

        // Sine easing
        easeInSine: (t) => 1 - Math.cos(t * Math.PI / 2),
        easeOutSine: (t) => Math.sin(t * Math.PI / 2),
        easeInOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,

        // Exponential easing
        easeInExpo: (t) => t === 0 ? 0 : Math.pow(2, 10 * (t - 1)),
        easeOutExpo: (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
        easeInOutExpo: (t) => {
            if (t === 0) return 0;
            if (t === 1) return 1;
            if (t < 0.5) return Math.pow(2, 20 * t - 10) / 2;
            return (2 - Math.pow(2, -20 * t + 10)) / 2;
        },

        // Circular easing
        easeInCirc: (t) => 1 - Math.sqrt(1 - t * t),
        easeOutCirc: (t) => Math.sqrt(1 - (--t) * t),
        easeInOutCirc: (t) => {
            if (t < 0.5) return (1 - Math.sqrt(1 - 4 * t * t)) / 2;
            return (Math.sqrt(1 - (-2 * t + 2) * (-2 * t + 2)) + 1) / 2;
        },

        // Back easing (overshoots then returns)
        easeInBack: (t) => {
            const c1 = 1.70158;
            const c3 = c1 + 1;
            return c3 * t * t * t - c1 * t * t;
        },
        easeOutBack: (t) => {
            const c1 = 1.70158;
            const c3 = c1 + 1;
            return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
        },
        easeInOutBack: (t) => {
            const c1 = 1.70158;
            const c2 = c1 * 1.525;
            return t < 0.5
                ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
                : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
        },

        // Elastic easing (spring effect)
        easeInElastic: (t) => {
            if (t === 0) return 0;
            if (t === 1) return 1;
            return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * (2 * Math.PI) / 3);
        },
        easeOutElastic: (t) => {
            if (t === 0) return 0;
            if (t === 1) return 1;
            return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1;
        },
        easeInOutElastic: (t) => {
            if (t === 0) return 0;
            if (t === 1) return 1;
            const c5 = (2 * Math.PI) / 4.5;
            return t < 0.5
                ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2
                : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1;
        },

        // Bounce easing
        easeInBounce: (t) => {
            return 1 - this.easingFunctions.easeOutBounce(1 - t);
        },
        easeOutBounce: (t) => {
            const n1 = 7.5625;
            const d1 = 2.75;
            if (t < 1 / d1) {
                return n1 * t * t;
            } else if (t < 2 / d1) {
                return n1 * (t -= 1.5 / d1) * t + 0.75;
            } else if (t < 2.5 / d1) {
                return n1 * (t -= 2.25 / d1) * t + 0.9375;
            } else {
                return n1 * (t -= 2.625 / d1) * t + 0.984375;
            }
        },
        easeInOutBounce: (t) => {
            return t < 0.5
                ? (1 - this.easingFunctions.easeOutBounce(1 - 2 * t)) / 2
                : (1 + this.easingFunctions.easeOutBounce(2 * t - 1)) / 2;
        }
    },

    // ============================================
    // TWEENING / INTERPOLATION FUNCTIONS
    // ============================================

    /**
     * Interpolate between two values using an easing function
     * @param {number} from - Start value
     * @param {number} to - End value
     * @param {number} progress - Progress between 0 and 1
     * @param {string} easingType - Name of easing function
     * @returns {number} Interpolated value
     */
    interpolateValue(from, to, progress, easingType = 'linear') {
        const easingFunc = this.easingFunctions[easingType] || this.easingFunctions.linear;
        const easedProgress = easingFunc.call(this, progress);
        return from + (to - from) * easedProgress;
    },

    /**
     * Interpolate a point between two points
     * @param {object} fromPoint - Start point {x, y, name, removable}
     * @param {object} toPoint - End point {x, y, name, removable}
     * @param {number} progress - Progress between 0 and 1
     * @param {string} easingType - Name of easing function
     * @returns {object} Interpolated point
     */
    interpolatePoint(fromPoint, toPoint, progress, easingType = 'linear') {
        return {
            name: fromPoint.name, // Keep the same name
            removable: fromPoint.removable, // Keep the same removable state
            x: Math.round(this.interpolateValue(fromPoint.x, toPoint.x, progress, easingType)),
            y: Math.round(this.interpolateValue(fromPoint.y, toPoint.y, progress, easingType))
        };
    },


    /**
     * Generate tween frames between two frames
     * @param {number} fromFrameIndex - Index of start frame
     * @param {number} toFrameIndex - Index of end frame
     * @param {number} tweenCount - Number of frames to generate between
     * @param {string} easingType - Name of easing function
     * @param {object} options - Options for what to interpolate {points: bool}
     * @returns {array} Array of generated tween frames
     */
    generateTweenFrames(fromFrameIndex, toFrameIndex, tweenCount, easingType = 'linear', options = {}) {
        if (this.cache.curAnimationId < 0) {
            console.error('[Animator] No animation selected');
            return [];
        }

        const animation = this.animatorData.animations[this.cache.curAnimationId];
        const fromFrame = animation.frames[fromFrameIndex];
        const toFrame = animation.frames[toFrameIndex];

        if (!fromFrame || !toFrame) {
            console.error('[Animator] Invalid frame indices');
            return [];
        }

        const interpolatePoints = options.points !== false; // Default true

        const tweenFrames = [];

        for (let i = 1; i <= tweenCount; i++) {
            const progress = i / (tweenCount + 1);

            const newFrame = {
                path: fromFrame.path, // Use the same image as from frame
                width: fromFrame.width,
                height: fromFrame.height,
                points: [],
                isTweened: true, // Mark as tweened for identification
                tweenData: {
                    fromIndex: fromFrameIndex,
                    toIndex: toFrameIndex,
                    progress: progress,
                    easingType: easingType
                }
            };

            // Interpolate points
            if (interpolatePoints && fromFrame.points && toFrame.points) {
                const minPoints = Math.min(fromFrame.points.length, toFrame.points.length);
                for (let j = 0; j < minPoints; j++) {
                    newFrame.points.push(
                        this.interpolatePoint(fromFrame.points[j], toFrame.points[j], progress, easingType)
                    );
                }
            } else {
                // Copy points from fromFrame if not interpolating
                newFrame.points = JSON.parse(JSON.stringify(fromFrame.points || []));
            }

            tweenFrames.push(newFrame);
        }

        return tweenFrames;
    },

    /**
     * Insert tween frames into the animation
     * @param {number} afterFrameIndex - Insert after this frame index
     * @param {array} tweenFrames - Array of frames to insert
     */
    insertTweenFrames(afterFrameIndex, tweenFrames) {
        if (this.cache.curAnimationId < 0) {
            console.error('[Animator] No animation selected');
            return;
        }

        const command = this.createInsertTweenFramesCommand(afterFrameIndex, tweenFrames);
        this.executeCommand(command);

        if (typeof notifications !== 'undefined') {
            notifications.success(`Inserted ${tweenFrames.length} tween frames`);
        }
    },

    /**
     * Adds an event listener and stores it for cleanup
     */
    _addTrackedListener(element, event, handler) {
        element.addEventListener(event, handler);
        this._eventListeners.push({ element, event, handler });
    },

    getFromResources(path) {
        if (path == "") {
            return null;
        }
        //
        let anim = fs.readFileSync(application.getFilePathFromResources(path));
        //
        try {
            anim = JSON.parse(anim);
            return anim;
        }
        catch (err) {
            alert("This animator file is damaged or corrupted!");
            return null;
        }

    },

    openAnimator(path, filename, data) {

        try {
            // ALWAYS reload the file from disk to ensure fresh data
            const freshData = fs.readFileSync(path, 'utf8');

            // Store path
            this.cache.animatorPath = path;

            // Update UI with filename
            $("#animatorEditorFileName").text(filename);

            // Parse the fresh data
            this.animatorData = JSON.parse(freshData);

            // Clear undo/redo history when opening a file
            this.clearHistory();

            // Mark as clean (no unsaved changes)
            this.isDirty = false;

            // Reset cache to ensure clean state
            this.cache.curAnimationId = -2;
            this.cache.curFrameId = -2;

            // Show the animator editor
            $("#animatorEditorBack").css("display", "flex");

            // Refresh and load
            this.refreshEditor();
            this.loadAnimator();


        } catch (err) {
            console.error('[Animator] ========================================');
            console.error('[Animator] FAILED TO OPEN ANIMATOR');
            console.error('[Animator] ========================================');
            console.error('[Animator] Error:', err);
            console.error('[Animator] Error message:', err.message);
            console.error('[Animator] Stack trace:', err.stack);

            alert("This animator file is damaged or corrupted!\n\nError: " + err.message);
        }
    },

    refreshEditor() {
        let aeb = $("#animatorEditorBody")[0];
        let aeh = $("#animatorEditorHeader")[0];
        aeb.style.height = aeb.parentElement.clientHeight - aeh.clientHeight + "px";
        //
        let abox = $("#animatorBox")[0];
        let aa = $("#animatorAnims")[0];
        abox.style.width = abox.parentElement.clientWidth - aa.clientWidth + "px";
        //
        let ainBox = $("#animatorInBox")[0];
        let aFrames = $('#animatorFrames')[0];
        ainBox.style.height = ainBox.parentElement.clientHeight - aFrames.clientHeight + "px";
        //
        let aaBox = $("#animatorAnimsBox")[0];
        let afp = $("#animatorFramePoints")[0];
        aaBox.style.height = aaBox.parentElement.clientHeight - afp.clientHeight + "px";
        //
        let afBox = $("#animatorFramesBox")[0];
        let afa = $("#animatorFramesActions")[0];
        afBox.style.width = afBox.parentElement.clientWidth - afa.clientWidth + "px";
        //
        let ai = $("#animatorImage")[0];
        let aip = $("#animatorImagePicker")[0];
        ai.style.width = ai.parentElement.clientWidth - aip.clientWidth + "px";
    },

    loadAnimator() {
        this.loadAnimations(0);
        this.loadImagePicker();
    },

    addAnimation(index) {
        if (index == -1) {
            index = this.animatorData.animations.length - 1;
        }

        const command = this.createAddAnimationCommand(index);
        this.executeCommand(command);

        const newIndex = command.animationIndex;

        setTimeout(function () {
            $(".animsBodyItem")[newIndex].scrollIntoView();
            $(".animsBodyItem[__ajs_animation_id='" + newIndex + "'] div")[0].style.display = "none";
            let sel = ".animsBodyInput[__ajs_animation_id='" + newIndex + "']";
            $(sel).attr("shown", true);
            $(sel)[0].focus();
            $(sel)[0].select();
        }, 100);
    },

    loadAnimations(id) {
        if (id == -1) {
            id = this.animatorData.animations.length - 1;
        }
        //
        if (this.cache.curAnimationId == id) {
            return;
        }
        this.cache.curAnimationId = id;
        //
        $('#animatorAnimsTitle').text('(' + this.animatorData.animations.length + ')');
        //remove all object
        let animsBody = document.querySelector("#animatorAnimsBody");
        while (animsBody.firstChild) {
            animsBody.removeChild(animsBody.firstChild);
        }
        //
        //
        if (this.animatorData.animations.length == 0) {
            return;
        }
        //
        this.animatorData.animations.forEach((anim, index) => {
            let elem = `
            <div class="animsBodyItem" selected="`+ (index == id ? "true" : "false") + `" __ajs_animation_id="` + (index - 0) + `">
                <div>
                    <label>`+ index + ` - </label>
                    <label __ajs_animation_id="` + index + `">` + anim.name + `</label>
                </div>
                <input class="animsBodyInput" value="`+ anim.name + `" __ajs_animation_id="` + index + `"/>
                <i class="ri-delete-bin-fill"></i>
            </div>`;
            animsBody.innerHTML = animsBody.innerHTML + elem.trim();
        });
        //
        this.cache.curFrameId = -2;
        this.loadCurrentAnimationFrames(0);
        //
        setTimeout(() => {
            let $self = this;

            // Remove old handlers to prevent duplication
            $(".animsBodyItem").off('click');
            $(".animsBodyItem i.ri-delete-bin-fill").off('click');
            $(".animsBodyItem label[__ajs_animation_id]").off('dblclick');
            $(".animsBodyInput").off('focusout keyup');

            //
            $(".animsBodyItem").click(function (e) {
                // Don't select if clicking delete button
                if ($(e.target).hasClass('ri-delete-bin-fill')) {
                    return;
                }

                if ($self.cache.curAnimationId == this.getAttribute("__ajs_animation_id") - 0) {
                    return;
                }
                //
                $(".animsBodyItem").attr("selected", "false");
                this.setAttribute('selected', "true");
                //
                $self.cache.curAnimationId = this.getAttribute("__ajs_animation_id") - 0;
                $self.cache.curFrameId = -2;
                $self.loadCurrentAnimationFrames(0);
            });
            //
            // Delete animation button handler
            $(".animsBodyItem i.ri-delete-bin-fill").click(function (e) {
                e.stopPropagation();
                const animId = $(this).parent().attr("__ajs_animation_id") - 0;
                $self.deleteAnimation(animId);
            });
            //
            $(".animsBodyItem label[__ajs_animation_id]").dblclick(function () {
                this.parentElement.style.display = "none";
                //
                let sel = ".animsBodyInput[__ajs_animation_id='" + this.getAttribute("__ajs_animation_id") + "']";
                $(sel).attr("shown", true);
                $(sel)[0].focus();
            });

            // Animation rename with undo/redo support
            let animationNameOriginalValue = {};

            // Save original name on focus
            $(".animsBodyInput").on('focus', function () {
                const animId = this.getAttribute("__ajs_animation_id") - 0;
                animationNameOriginalValue[animId] = $self.animatorData.animations[animId].name;
            });

            // Update visual label in real-time on input
            $(".animsBodyInput").on('input', function () {
                const animId = this.getAttribute("__ajs_animation_id") - 0;
                let sel = ".animsBodyItem label[__ajs_animation_id='" + animId + "']";
                $(sel).text(this.value);
            });

            // Create undo command on blur
            $(".animsBodyInput").on('focusout', function () {
                this.setAttribute("shown", "false");
                const animId = this.getAttribute("__ajs_animation_id") - 0;
                const newValue = this.value;

                let sel = ".animsBodyItem label[__ajs_animation_id='" + animId + "']";
                $(sel)[0].parentElement.style.display = "block";

                // Create undo command if value changed
                if (animationNameOriginalValue[animId] !== undefined && animationNameOriginalValue[animId] !== newValue) {
                    const command = $self.createAnimationPropertyChangeCommand(
                        animId,
                        'name',
                        animationNameOriginalValue[animId],
                        newValue
                    );
                    $self.executeCommand(command);
                } else {
                    // If no change, just set the value back to ensure consistency
                    $(sel).text($self.animatorData.animations[animId].name);
                }

                delete animationNameOriginalValue[animId];
            });

            // Handle Enter key press
            $(".animsBodyInput").on('keyup', function (event) {
                if (event.key === 'Enter') {
                    $(this).blur(); // Trigger focusout which will create the command
                }
            });
        }, 100);
    },

    loadCurrentAnimationFrames(id) {
        //
        if (id == -1) {
            id = this.animatorData.animations[this.cache.curAnimationId].frames.length - 1;
        }
        if (this.animatorData.animations[this.cache.curAnimationId].frames.length == 1) {
            id = 0;
        }
        //
        if (this.cache.curFrameId == id) {
            return;
        }
        //
        //
        //get animation properties
        $("#afaFrameRate").val(this.animatorData.animations[this.cache.curAnimationId].frameRate);
        $("#afaLoop")[0].checked = this.animatorData.animations[this.cache.curAnimationId].loop;
        $("#afaStartLoopFrame").val(this.animatorData.animations[this.cache.curAnimationId].startLoopFrame);
        //
        //
        //
        this.cache.curFrameId = id;
        this.loadCurrentAnimationImage();
        //
        //
        $('#animatorFramesTitle').text('(' + this.animatorData.animations[this.cache.curAnimationId].frames.length + ')');
        //
        let afBody = document.querySelector("#animatorFramesBody");
        while (afBody.firstChild) {
            afBody.removeChild(afBody.firstChild);
        }
        //
        if (this.animatorData.animations[this.cache.curAnimationId].frames.length == 0) {
            return;
        }
        //
        this.animatorData.animations[this.cache.curAnimationId].frames.forEach((image, index) => {
            const path = application.getFilePathFromResources(image.path);
            const filename = application.getFileNameFromResources(image.path);
            //
            let elem = `
            <div class='afBodyItem `+ (index == id ? "selected" : "") + `' path = '` + path + `' __ajs_animation_frame_id="` + index + `">
                <img class="local-image" src='`+ path + `' filename='` + filename + `' assetsPath='` + image.path + `' __ajs_animation_frame_id="` + index + `"/>
                <i class="ri-delete-bin-fill"></i>
                <center>
                    <div>`+ filename + `</div>
                </center>
            </div>`;
            //show the file
            afBody.innerHTML = afBody.innerHTML + elem.trim();
        });
        //
        setTimeout(() => {
            let $self = this;
            //
            // Only scroll if id is valid
            if (id >= 0 && id < $('.afBodyItem').length) {
                $('.afBodyItem')[id].scrollIntoView();
            }
            //
            // Remove old event handlers to prevent duplication
            $('.afBodyItem').off('click');
            $('.afBodyItem i.ri-delete-bin-fill').off('click');
            //
            $('.afBodyItem').click(function (e) {
                // Don't select if clicking delete button
                if ($(e.target).hasClass('ri-delete-bin-fill')) {
                    return;
                }

                const frameIndex = this.getAttribute("__ajs_animation_frame_id") - 0;

                // Multi-selection with Ctrl/Cmd
                if (e.ctrlKey || e.metaKey) {
                    // Toggle selection
                    if ($self.cache.selectedFrames.includes(frameIndex)) {
                        // Remove from selection
                        $self.cache.selectedFrames = $self.cache.selectedFrames.filter(idx => idx !== frameIndex);
                        this.classList.remove("selected");

                        // If this was the current frame, select another one or deselect
                        if ($self.cache.curFrameId === frameIndex) {
                            if ($self.cache.selectedFrames.length > 0) {
                                $self.cache.curFrameId = $self.cache.selectedFrames[0];
                                $self.loadCurrentAnimationImage();
                            } else {
                                $self.cache.curFrameId = -2;
                            }
                        }
                    } else {
                        // Add to selection
                        $self.cache.selectedFrames.push(frameIndex);
                        this.classList.add("selected");
                        $self.cache.curFrameId = frameIndex;
                        $self.cache.lastSelectedFrame = frameIndex;
                        $self.loadCurrentAnimationImage();
                    }
                }
                // Range selection with Shift
                else if (e.shiftKey && $self.cache.lastSelectedFrame >= 0) {
                    const start = Math.min($self.cache.lastSelectedFrame, frameIndex);
                    const end = Math.max($self.cache.lastSelectedFrame, frameIndex);

                    // Clear previous selection
                    $self.cache.selectedFrames = [];
                    $(".afBodyItem").removeClass("selected");

                    // Select range
                    for (let i = start; i <= end; i++) {
                        $self.cache.selectedFrames.push(i);
                        $(`.afBodyItem[__ajs_animation_frame_id="${i}"]`).addClass("selected");
                    }

                    $self.cache.curFrameId = frameIndex;
                    $self.loadCurrentAnimationImage();
                }
                // Single selection (default)
                else {
                    // Clear all selections
                    $self.cache.selectedFrames = [frameIndex];
                    $(".afBodyItem").removeClass("selected");
                    this.classList.add("selected");

                    $self.cache.curFrameId = frameIndex;
                    $self.cache.lastSelectedFrame = frameIndex;
                    $self.loadCurrentAnimationImage();
                }
            });
            //
            // Delete frame button handler
            $('.afBodyItem i.ri-delete-bin-fill').click(function (e) {
                e.stopPropagation();
                const frameId = $(this).parent().attr("__ajs_animation_frame_id") - 0;

                // If multiple frames are selected and this frame is in the selection, delete all selected
                if ($self.cache.selectedFrames.length > 1 && $self.cache.selectedFrames.includes(frameId)) {
                    $self.deleteMultipleFrames($self.cache.curAnimationId, $self.cache.selectedFrames);
                } else {
                    // Single frame delete
                    $self.deleteFrame($self.cache.curAnimationId, frameId);
                }
            });
        }, 100);

        // Load timeline
        this.loadTimeline();

        // Load animation events
        this.loadAnimationEvents();
    },

    loadCurrentAnimationImage() {
        let aibImg = $('#aibImg')[0];
        let aibp = $('#aibPoints')[0];
        //
        if (this.animatorData.animations[this.cache.curAnimationId].frames.length == 0) {
            aibImg.style.display = "none";
            aibp.style.display = "none";
            return;
        }
        //
        aibImg.style.display = "block";
        aibp.style.display = "block";
        //
        aibImg.src = application.getFilePathFromResources(this.animatorData.animations[this.cache.curAnimationId].frames[this.cache.curFrameId].path);
        //
        let $self = this;
        aibImg.onload = function () {
            // this.style.width = this.naturalWidth + "px";
            // this.style.height = this.naturalHeight + "px";
            let zoom = $("#animatorZoom")[0].value;
            $self.applyImageZoom(zoom);
        };
        //
        //load frame points
        this.loadCurrentFramePoints();

        // Update onion skinning
        this.updateOnionSkinning();

        // Update frame blending
        this.updateFrameBlending();
    },

    /**
     * Calculate zoom value from slider input
     * @param {number} sliderValue - Value from zoom slider (50-150)
     * @returns {number} Calculated zoom factor
     */
    calculateZoom(sliderValue) {
        if (sliderValue > 100) {
            return ((sliderValue - 100) * 8) / 50 + 1;
        } else if (sliderValue == 100) {
            return 1;
        } else {
            return sliderValue / 100;
        }
    },

    /**
     * Attach event handlers for point inputs ONCE using event delegation
     * This prevents duplicate handlers and improves performance
     */
    _attachPointInputHandlers() {
        if (this._pointInputHandlersAttached) {
            return; // Already attached, don't attach again
        }

        const $self = this;
        const afpbPoints = document.querySelector('#afpbPoints');

        if (!afpbPoints) {
            console.error('[Animator] afpbPoints container not found');
            return;
        }


        // Handle Enter key on all point inputs
        afpbPoints.addEventListener('keydown', function(event) {
            if (event.key !== 'Enter') return;
            if ($self.cache.curAnimationId < 0 || $self.cache.curFrameId < 0) return;

            const target = event.target;

            // Handle point name input
            if (target.classList.contains('afpbPointNameInput')) {
                const pointId = parseInt(target.getAttribute('__ajs_frame_point_id'));
                const frame = $self.animatorData.animations[$self.cache.curAnimationId].frames[$self.cache.curFrameId];
                const oldValue = frame.points[pointId].name;
                const newValue = target.value;

                if (oldValue !== newValue) {
                    const command = $self.createPointPropertyChangeCommand(pointId, 'name', oldValue, newValue);
                    $self.executeCommand(command);
                }
                target.blur();
            }
            // Handle X coordinate input
            else if (target.classList.contains('afpbPointX')) {
                const pointId = parseInt(target.getAttribute('__ajs_frame_point_id'));
                const frame = $self.animatorData.animations[$self.cache.curAnimationId].frames[$self.cache.curFrameId];
                const newValue = parseFloat(target.value) || 0;
                const key = 'x_' + pointId;

                if ($self._pointInputOriginalValues[key] !== undefined && $self._pointInputOriginalValues[key] !== newValue) {
                    const command = $self.createPointPropertyChangeCommand(pointId, 'x', $self._pointInputOriginalValues[key], newValue);
                    $self.executeCommand(command);
                }
                delete $self._pointInputOriginalValues[key];
                target.blur();
            }
            // Handle Y coordinate input
            else if (target.classList.contains('afpbPointY')) {
                const pointId = parseInt(target.getAttribute('__ajs_frame_point_id'));
                const frame = $self.animatorData.animations[$self.cache.curAnimationId].frames[$self.cache.curFrameId];
                const newValue = parseFloat(target.value) || 0;
                const key = 'y_' + pointId;

                if ($self._pointInputOriginalValues[key] !== undefined && $self._pointInputOriginalValues[key] !== newValue) {
                    const command = $self.createPointPropertyChangeCommand(pointId, 'y', $self._pointInputOriginalValues[key], newValue);
                    $self.executeCommand(command);
                }
                delete $self._pointInputOriginalValues[key];
                target.blur();
            }
        }, false);

        // Handle focus (store original value for undo)
        afpbPoints.addEventListener('focusin', function(event) {
            if ($self.cache.curAnimationId < 0 || $self.cache.curFrameId < 0) return;

            const target = event.target;
            const frame = $self.animatorData.animations[$self.cache.curAnimationId].frames[$self.cache.curFrameId];

            if (target.classList.contains('afpbPointX')) {
                const pointId = parseInt(target.getAttribute('__ajs_frame_point_id'));
                const key = 'x_' + pointId;
                $self._pointInputOriginalValues[key] = frame.points[pointId].x;
            } else if (target.classList.contains('afpbPointY')) {
                const pointId = parseInt(target.getAttribute('__ajs_frame_point_id'));
                const key = 'y_' + pointId;
                $self._pointInputOriginalValues[key] = frame.points[pointId].y;
            }
        }, false);

        // Handle blur (apply changes with undo/redo)
        afpbPoints.addEventListener('focusout', function(event) {
            if ($self.cache.curAnimationId < 0 || $self.cache.curFrameId < 0) return;

            const target = event.target;

            // Handle point name
            if (target.classList.contains('afpbPointNameInput')) {
                const pointId = parseInt(target.getAttribute('__ajs_frame_point_id'));
                const frame = $self.animatorData.animations[$self.cache.curAnimationId].frames[$self.cache.curFrameId];
                const oldValue = frame.points[pointId].name;
                const newValue = target.value;

                if (oldValue !== newValue) {
                    const command = $self.createPointPropertyChangeCommand(pointId, 'name', oldValue, newValue);
                    $self.executeCommand(command);
                }
            }
            // Handle X coordinate
            else if (target.classList.contains('afpbPointX')) {
                const pointId = parseInt(target.getAttribute('__ajs_frame_point_id'));
                const frame = $self.animatorData.animations[$self.cache.curAnimationId].frames[$self.cache.curFrameId];
                const newValue = parseFloat(target.value) || 0;
                const key = 'x_' + pointId;

                // Update data immediately
                frame.points[pointId].x = newValue;

                // Update visual position
                const zoomValue = $("#animatorZoom")[0].value;
                const zoom = $self.calculateZoom(zoomValue);
                const visualPoint = $(`.aibFramePoint[__ajs_frame_point_id="${pointId}"]`)[0];
                if (visualPoint) {
                    visualPoint.style.left = (newValue * zoom) + "px";
                }

                // Create undo command if value changed
                if ($self._pointInputOriginalValues[key] !== undefined && $self._pointInputOriginalValues[key] !== newValue) {
                    const command = $self.createPointPropertyChangeCommand(pointId, 'x', $self._pointInputOriginalValues[key], newValue);
                    $self.executeCommand(command);
                }
                delete $self._pointInputOriginalValues[key];
            }
            // Handle Y coordinate
            else if (target.classList.contains('afpbPointY')) {
                const pointId = parseInt(target.getAttribute('__ajs_frame_point_id'));
                const frame = $self.animatorData.animations[$self.cache.curAnimationId].frames[$self.cache.curFrameId];
                const newValue = parseFloat(target.value) || 0;
                const key = 'y_' + pointId;

                // Update data immediately
                frame.points[pointId].y = newValue;

                // Update visual position
                const zoomValue = $("#animatorZoom")[0].value;
                const zoom = $self.calculateZoom(zoomValue);
                const visualPoint = $(`.aibFramePoint[__ajs_frame_point_id="${pointId}"]`)[0];
                if (visualPoint) {
                    visualPoint.style.top = (newValue * zoom) + "px";
                }

                // Create undo command if value changed
                if ($self._pointInputOriginalValues[key] !== undefined && $self._pointInputOriginalValues[key] !== newValue) {
                    const command = $self.createPointPropertyChangeCommand(pointId, 'y', $self._pointInputOriginalValues[key], newValue);
                    $self.executeCommand(command);
                }
                delete $self._pointInputOriginalValues[key];
            }
        }, false);

        // Handle input event only for visual point name label update (no data changes)
        afpbPoints.addEventListener('input', function(event) {
            const target = event.target;

            // Update visual point label in real-time
            if (target.classList.contains('afpbPointNameInput')) {
                const pointId = parseInt(target.getAttribute('__ajs_frame_point_id'));
                const visualPoint = $(`.aibFramePoint[__ajs_frame_point_id="${pointId}"]`)[0];
                if (visualPoint) {
                    const label = visualPoint.querySelector('.aibPointLabel');
                    if (label) {
                        label.textContent = target.value;
                    }
                }
            }
        }, false);

        // Handle +/- buttons with progressive acceleration
        let repeatTimeout = null;
        let repeatAcceleration = null;
        let repeatDelay = 100;
        let currentButton = null;
        let currentIsIncrease = false;
        let currentEvent = null;
        let lastAppliedValue = null;

        // Function to increment/decrement point coordinate
        const changePointCoordinate = function(button, isIncrease, event, skipCommand = false) {
            const pointId = parseInt(button.getAttribute('__ajs_frame_point_id'));
            const axis = button.getAttribute('data-axis'); // 'x' or 'y'

            if ($self.cache.curAnimationId < 0 || $self.cache.curFrameId < 0) return;

            const frame = $self.animatorData.animations[$self.cache.curAnimationId].frames[$self.cache.curFrameId];
            const point = frame.points[pointId];
            if (!point) return;

            let currentValue = point[axis];

            // Increment amount based on modifier keys
            let increment = 1;
            if (event && event.shiftKey) {
                increment = 10; // Shift = +10/-10
            } else if (event && event.ctrlKey) {
                increment = 0.1; // Ctrl = +0.1/-0.1
            }

            if (isIncrease) {
                currentValue += increment;
            } else {
                currentValue -= increment;
            }

            // Round to avoid floating point issues
            currentValue = Math.round(currentValue * 100) / 100;

            // Update data
            point[axis] = currentValue;

            // Update input
            const inputClass = axis === 'x' ? '.afpbPointX' : '.afpbPointY';
            const input = button.parentElement.querySelector(inputClass);
            if (input) {
                input.value = Math.round(currentValue);
            }

            // Update visual position
            const zoomValue = $("#animatorZoom")[0].value;
            const zoom = $self.calculateZoom(zoomValue);
            const visualPoint = $(`.aibFramePoint[__ajs_frame_point_id="${pointId}"]`)[0];
            if (visualPoint) {
                if (axis === 'x') {
                    visualPoint.style.left = (currentValue * zoom) + "px";
                } else {
                    visualPoint.style.top = (currentValue * zoom) + "px";
                }
            }

            // Create undo command if not skipped
            if (!skipCommand) {
                const oldValue = currentValue - (isIncrease ? increment : -increment);
                const command = $self.createPointPropertyChangeCommand(pointId, axis, oldValue, currentValue);
                $self.executeCommand(command);
            }

            return currentValue;
        };

        // Handle mousedown on +/- buttons
        afpbPoints.addEventListener('mousedown', function(event) {
            const target = event.target.closest('.afpbPointBtn');
            if (!target) return;

            event.preventDefault(); // Prevent text selection

            currentButton = target;
            currentIsIncrease = target.classList.contains('afpbPointIncrease');
            currentEvent = event;

            // First click - apply immediately with command
            lastAppliedValue = changePointCoordinate(target, currentIsIncrease, event, false);

            // Reset acceleration parameters
            repeatDelay = 100; // Start with 100ms delay

            // Progressive acceleration function
            const acceleratedRepeat = function() {
                // Update value without creating command (for speed)
                lastAppliedValue = changePointCoordinate(currentButton, currentIsIncrease, currentEvent, true);

                // Decrease delay for acceleration (minimum 20ms)
                repeatDelay = Math.max(20, repeatDelay - 5);

                // Schedule next repeat with new delay
                repeatAcceleration = setTimeout(acceleratedRepeat, repeatDelay);
            };

            // Start repeating after initial delay
            repeatTimeout = setTimeout(() => {
                acceleratedRepeat();
            }, 400); // Start repeating after 400ms hold
        }, false);

        // Stop repeat on mouseup or mouseleave
        const stopRepeat = function(event) {
            if (repeatTimeout) {
                clearTimeout(repeatTimeout);
                repeatTimeout = null;
            }
            if (repeatAcceleration) {
                clearTimeout(repeatAcceleration);
                repeatAcceleration = null;
            }

            // If we were repeating, create final undo command with accumulated change
            if (currentButton && lastAppliedValue !== null) {
                const pointId = parseInt(currentButton.getAttribute('__ajs_frame_point_id'));
                const axis = currentButton.getAttribute('data-axis');

                // The last value is already in the data, just mark as dirty
                $self.isDirty = true;
                $self.updateUndoRedoButtons();
            }

            currentButton = null;
            currentEvent = null;
            lastAppliedValue = null;
        };

        afpbPoints.addEventListener('mouseup', stopRepeat, false);
        afpbPoints.addEventListener('mouseleave', stopRepeat, false);

        // Handle delete point button with event delegation
        afpbPoints.addEventListener('click', function(event) {
            const deleteBtn = event.target.closest('.afpbPoint i.ri-delete-bin-fill');
            if (deleteBtn) {
                event.stopPropagation();
                const pointSpan = deleteBtn.closest('.afpbPoint');
                if (pointSpan) {
                    const pointId = parseInt(pointSpan.getAttribute('__ajs_frame_point_id'));
                    $self.deleteFramePoint(pointId);
                }
            }
        }, false);

        this._pointInputHandlersAttached = true;
    },

    loadCurrentFramePoints() {
        let afpbPoints = $('#afpbPoints')[0];
        while (afpbPoints.firstChild) {
            afpbPoints.removeChild(afpbPoints.firstChild);
        }
        //
        this.animatorData.animations[this.cache.curAnimationId].frames[this.cache.curFrameId].points.forEach((point, index) => {
            //
            const isReadonly = point.removable === false ? 'readonly' : '';
            const escapedName = (point.name || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
            let elem = `
            <span class="afpbPoint" ajs_frame_point_removable="${point.removable}" __ajs_frame_point_id="${index}">
                <div class="afpbPointName">
                    <label>Point Name</label>
                    <input type="text" class="afpbPointNameInput" value="${escapedName}" __ajs_frame_point_id="${index}" ${isReadonly}>
                    <i class="ri-delete-bin-fill"></i>
                    <i class="ri-lock-fill"></i>
                </div>
                <div class="afpbPointPos">
                    <label>X</label>
                    <div class="afpbPointPosNumber">
                        <button class="afpbPointBtn afpbPointDecrease" __ajs_frame_point_id="${index}" data-axis="x">
                            <i class="ri-subtract-line"></i>
                        </button>
                        <input type="text" class="afpbPointX" value="${Math.round(point.x)}" __ajs_frame_point_id="${index}">
                        <button class="afpbPointBtn afpbPointIncrease" __ajs_frame_point_id="${index}" data-axis="x">
                            <i class="ri-add-line"></i>
                        </button>
                    </div>
                    <label>Y</label>
                    <div class="afpbPointPosNumber">
                        <button class="afpbPointBtn afpbPointDecrease" __ajs_frame_point_id="${index}" data-axis="y">
                            <i class="ri-subtract-line"></i>
                        </button>
                        <input type="text" class="afpbPointY" value="${Math.round(point.y)}" __ajs_frame_point_id="${index}">
                        <button class="afpbPointBtn afpbPointIncrease" __ajs_frame_point_id="${index}" data-axis="y">
                            <i class="ri-add-line"></i>
                        </button>
                    </div>
                </div>
            </span>`;
            //show the file
            afpbPoints.innerHTML = afpbPoints.innerHTML + elem.trim();
        });

        // Attach event handlers once using event delegation
        this._attachPointInputHandlers();

        // Also reload visual points after sidebar points are loaded
        this.loadCurrentFramePointsVisual();
    },

    /**
     * Load visual draggable frame points on the image
     */
    loadCurrentFramePointsVisual() {
        if (this.cache.curAnimationId < 0 || this.cache.curFrameId < 0) return;

        // Cleanup old event listeners to prevent memory leaks and conflicts
        this._cleanupEventListeners();

        let aibp = $('#aibPoints')[0];

        // Remove all existing visual points
        while (aibp.firstChild) {
            aibp.removeChild(aibp.firstChild);
        }

        const frame = this.animatorData.animations[this.cache.curAnimationId].frames[this.cache.curFrameId];
        const framePoints = frame.points || [];
        const zoomValue = $("#animatorZoom")[0].value;
        const zoom = this.calculateZoom(zoomValue);

        const $self = this;

        framePoints.forEach((point, index) => {
            // Create point element
            const elem = document.createElement("DIV");
            elem.className = "aibFramePoint";
            elem.setAttribute("__ajs_frame_point_id", index);
            elem.style.left = (point.x * zoom) + "px";
            elem.style.top = (point.y * zoom) + "px";

            // Create label
            const label = document.createElement("DIV");
            label.className = "aibPointLabel";
            label.textContent = point.name;
            elem.appendChild(label);

            aibp.appendChild(elem);

            // Make point draggable
            let offsetX = 0, offsetY = 0, isDragging = false;
            let startX = 0, startY = 0; // Store original position for undo

            function onMouseDown(event) {
                isDragging = true;
                // Store original position for undo
                startX = point.x;
                startY = point.y;

                const container = aibp.getBoundingClientRect();
                offsetX = event.clientX - container.left - parseInt(elem.style.left || 0);
                offsetY = event.clientY - container.top - parseInt(elem.style.top || 0);
                elem.classList.add('dragging');
                event.preventDefault();
                event.stopPropagation();
            }

            function onMouseMove(event) {
                if (!isDragging) return;

                const container = aibp.getBoundingClientRect();
                let x = event.clientX - container.left - offsetX;
                let y = event.clientY - container.top - offsetY;

                // Update visual position
                elem.style.left = x + "px";
                elem.style.top = y + "px";

                // Update data (convert back from zoomed coordinates)
                const currentZoom = $self.calculateZoom($("#animatorZoom")[0].value);
                point.x = x / currentZoom;
                point.y = y / currentZoom;

                // Update the input fields in the sidebar without triggering events
                const inputX = $(`.afpbPointX[__ajs_frame_point_id="${index}"]`)[0];
                const inputY = $(`.afpbPointY[__ajs_frame_point_id="${index}"]`)[0];
                if (inputX) inputX.value = Math.round(point.x);
                if (inputY) inputY.value = Math.round(point.y);

                event.preventDefault();
                event.stopPropagation();
            }

            function onMouseUp() {
                if (isDragging) {
                    isDragging = false;
                    elem.classList.remove('dragging');

                    // Create undo command if position changed
                    const endX = point.x;
                    const endY = point.y;
                    if (Math.abs(startX - endX) > 0.1 || Math.abs(startY - endY) > 0.1) {
                        // Save indices and point name as identifier
                        const animIndex = $self.cache.curAnimationId;
                        const frmIndex = $self.cache.curFrameId;
                        const ptIndex = index;
                        const ptName = point.name;

                        const command = {
                            name: 'Move Frame Point',
                            animationIndex: animIndex,
                            frameIndex: frmIndex,
                            pointIndex: ptIndex,
                            pointName: ptName, // Use name as unique identifier
                            startX: startX,
                            startY: startY,
                            endX: endX,
                            endY: endY,

                            execute() {
                                const frame = $self.animatorData.animations[this.animationIndex].frames[this.frameIndex];

                                // Find point by name
                                const currentPointIndex = frame.points.findIndex(p => p.name === this.pointName);
                                if (currentPointIndex === -1) {
                                    console.error('[Animator] Point not found:', this.pointName);
                                    throw new Error(`Point "${this.pointName}" not found in frame`);
                                }

                                const pt = frame.points[currentPointIndex];
                                pt.x = this.endX;
                                pt.y = this.endY;

                                // Update visual position and inputs without full reload
                                if ($self.cache.curAnimationId === this.animationIndex && $self.cache.curFrameId === this.frameIndex) {
                                    const currentZoom = $self.calculateZoom($("#animatorZoom")[0].value);
                                    const visualPoint = $(`.aibFramePoint[__ajs_frame_point_id="${currentPointIndex}"]`)[0];
                                    if (visualPoint) {
                                        visualPoint.style.left = (this.endX * currentZoom) + "px";
                                        visualPoint.style.top = (this.endY * currentZoom) + "px";
                                    }
                                    const inputX = $(`.afpbPointX[__ajs_frame_point_id="${currentPointIndex}"]`)[0];
                                    const inputY = $(`.afpbPointY[__ajs_frame_point_id="${currentPointIndex}"]`)[0];
                                    if (inputX) inputX.value = Math.round(this.endX);
                                    if (inputY) inputY.value = Math.round(this.endY);
                                }
                            },
                            undo() {
                                const frame = $self.animatorData.animations[this.animationIndex].frames[this.frameIndex];

                                // Find point by name
                                const currentPointIndex = frame.points.findIndex(p => p.name === this.pointName);
                                if (currentPointIndex === -1) {
                                    console.error('[Animator] Point not found:', this.pointName);
                                    throw new Error(`Point "${this.pointName}" not found in frame`);
                                }

                                const pt = frame.points[currentPointIndex];
                                pt.x = this.startX;
                                pt.y = this.startY;

                                // Update visual position and inputs without full reload
                                if ($self.cache.curAnimationId === this.animationIndex && $self.cache.curFrameId === this.frameIndex) {
                                    const currentZoom = $self.calculateZoom($("#animatorZoom")[0].value);
                                    const visualPoint = $(`.aibFramePoint[__ajs_frame_point_id="${currentPointIndex}"]`)[0];
                                    if (visualPoint) {
                                        visualPoint.style.left = (this.startX * currentZoom) + "px";
                                        visualPoint.style.top = (this.startY * currentZoom) + "px";
                                    }
                                    const inputX = $(`.afpbPointX[__ajs_frame_point_id="${currentPointIndex}"]`)[0];
                                    const inputY = $(`.afpbPointY[__ajs_frame_point_id="${currentPointIndex}"]`)[0];
                                    if (inputX) inputX.value = Math.round(this.startX);
                                    if (inputY) inputY.value = Math.round(this.startY);
                                }
                            }
                        };

                        // Add to undo stack without re-executing (already applied during drag)
                        $self.commandHistory.undoStack.push(command);
                        $self.commandHistory.redoStack = [];
                        if ($self.commandHistory.undoStack.length > $self.commandHistory.maxHistorySize) {
                            $self.commandHistory.undoStack.shift();
                        }
                        $self.updateUndoRedoButtons();
                    }
                }
            }

            // Attach event listeners with tracking for cleanup
            $self._addTrackedListener(elem, 'mousedown', onMouseDown);
            $self._addTrackedListener(document, 'mousemove', onMouseMove);
            $self._addTrackedListener(document, 'mouseup', onMouseUp);
        });
    },

    /**
     * Update visual points positions when zoom changes
     */
    showFramePoints(zoom) {
        const framePoints = this.animatorData.animations[this.cache.curAnimationId]?.frames[this.cache.curFrameId]?.points;
        if (!framePoints) return;

        const visualPoints = document.querySelectorAll(".aibFramePoint");
        visualPoints.forEach((pointElem, index) => {
            const pointId = parseInt(pointElem.getAttribute("__ajs_frame_point_id"));
            if (framePoints[pointId]) {
                const point = framePoints[pointId];
                pointElem.style.left = (point.x * zoom) + "px";
                pointElem.style.top = (point.y * zoom) + "px";
            }
        });
    },


    zoomIn() {
        let input = $("#animatorZoom")[0];
        input.value -= -input.step;
        this.applyImageZoom(input.value);
    },

    zoomOut() {
        let input = $("#animatorZoom")[0];
        input.value -= input.step;
        this.applyImageZoom(input.value);
    },

    fitZoomToImage() {
        $("#animatorZoom").val(100);
        this.applyImageZoom(100);
    },

    applyImageZoom(zoomValue) {
        let aibImg = $('#aibImg')[0];
        let aiBox = $('#animatorImageBox')[0];

        // Calculate zoom using helper method
        const zoom = this.calculateZoom(zoomValue);

        // Apply zoom to image and container
        aiBox.style.width = aibImg.naturalWidth * zoom + "px";
        aiBox.style.height = aibImg.naturalHeight * zoom + "px";

        aibImg.style.width = aibImg.naturalWidth * zoom + "px";
        aibImg.style.height = aibImg.naturalHeight * zoom + "px";

        // Center image if smaller than container
        if (aiBox.clientWidth < aiBox.parentElement.clientWidth) {
            if (aiBox.clientHeight < aiBox.parentElement.clientHeight) {
                aiBox.setAttribute('center', "hv");
            }
            else {
                aiBox.setAttribute('center', "h");
            }
        }
        else {
            if (aiBox.clientHeight < aiBox.parentElement.clientHeight) {
                aiBox.setAttribute('center', "v");
            }
            else {
                aiBox.setAttribute('center', "");
            }
        }

        // Apply zoom to frame points
        this.showFramePoints(zoom);
    },


    findAssetsFolderInTree(files) {
        if (!files || !Array.isArray(files)) return null;

        for (let file of files) {
            // Check if this is the assets folder
            if (file.type === 'dir' && file.name === 'assets') {
                return file;
            }

            // Recursively search in children if it's a directory
            if (file.type === 'dir' && file.children) {
                const found = this.findAssetsFolderInTree(file.children);
                if (found) return found;
            }
        }

        return null;
    },

    loadImagePicker() {
        //reset content temp
        let aipBody = document.querySelector("#animatorImagePickerBody");
        while (aipBody.firstChild) {
            aipBody.removeChild(aipBody.firstChild);
        }
        //
        // Find and load only assets folder
        const assetsFolder = this.findAssetsFolderInTree(globals.project.files);
        if (assetsFolder) {
            this.loadAssetsImages(assetsFolder.children, 'assets', '', 0);
        }
        //
        setTimeout(() => {
            let $self = this;

            // Click event for all image items - with multi-selection support
            $('.aipBodyItem').click(function (e) {
                const imagePath = this.getAttribute("path");

                // Multi-selection with Ctrl/Cmd
                if (e.ctrlKey || e.metaKey) {
                    // Toggle selection
                    if ($self.cache.selectedImages.includes(imagePath)) {
                        $self.cache.selectedImages = $self.cache.selectedImages.filter(p => p !== imagePath);
                        this.classList.remove("selected");
                    } else {
                        $self.cache.selectedImages.push(imagePath);
                        this.classList.add("selected");
                    }
                }
                // Single selection (default)
                else {
                    $self.cache.selectedImages = [imagePath];
                    $(".aipBodyItem").removeClass("selected");
                    this.classList.add("selected");
                }

                $self.cache.imagePickerPath = imagePath;

                // Update selection counter
                $self.updateSelectionCounter();
            });

            // Button to add all selected images
            $('#aipAddSelectedBtn').off('click').on('click', function() {
                if ($self.cache.selectedImages.length > 0) {
                    $self.addMultipleFrames($self.cache.selectedImages);
                }
            });

            // Double-click to add frames
            $(".aipBodyItem img").dblclick(function () {
                // If multiple images selected, add all of them
                if ($self.cache.selectedImages.length > 1) {
                    $self.addMultipleFrames($self.cache.selectedImages);
                } else {
                    // Single image
                    let originalWidth = this.naturalWidth;
                    let originalHeight = this.naturalHeight;
                    let imagePath = this.getAttribute("assetsPath");

                    const command = $self.createAddFrameCommand(
                        $self.cache.curAnimationId,
                        $self.cache.curFrameId + 1,
                        imagePath,
                        originalWidth,
                        originalHeight
                    );

                    $self.executeCommand(command);
                }
            });
        }, 100);
    },

    /**
     * Update the selection counter display
     */
    updateSelectionCounter() {
        const count = this.cache.selectedImages.length;
        const footer = document.getElementById('animatorImagePickerFooter');
        const countSpan = document.getElementById('aipSelectionCount');

        if (count > 0) {
            // Show footer and update count
            footer.style.display = 'flex';
            countSpan.textContent = `${count} image${count > 1 ? 's' : ''} selected`;
        } else {
            // Hide footer when no selection
            footer.style.display = 'none';
        }
    },

    // ////////////
    // IMAGE PICKER
    // ////////////
    loadAssetsImages(files, folderName = null, parentPath = '', depth = 0) {
        let aipBody = document.querySelector("#animatorImagePickerBody");
        let targetContainer = aipBody;

        // If we have a parent path, find the parent folder content
        if (parentPath) {
            const parentId = parentPath.replace(/[^a-zA-Z0-9]/g, '_');
            const parentFolder = document.getElementById(parentId);
            if (parentFolder) {
                targetContainer = parentFolder;
            }
        }

        // Separate folders and files
        const folders = [];
        const imageFiles = [];

        files.forEach((file) => {
            if (file.type == "dir") {
                folders.push(file);
            } else {
                imageFiles.push(file);
            }
        });

        // Create folder sections first
        folders.forEach((folder) => {
            const fullPath = parentPath ? `${parentPath}/${folder.name}` : folder.name;
            const folderId = fullPath.replace(/[^a-zA-Z0-9]/g, '_');
            const indentStyle = `style='padding-left: ${depth * 16}px;'`;

            const folderSection = `
                <div class='aipFolderSection' data-folder='${folderId}' data-depth='${depth}'>
                    <div class='aipFolderHeader' onclick='animator.toggleFolder("${folderId}")' ${indentStyle}>
                        <i class='ri-folder-3-fill' style='color: #ffa500; margin-right: 8px;'></i>
                        <span class='aipFolderName'>${folder.name}</span>
                        <i class='ri-arrow-down-s-line aipFolderToggle'></i>
                    </div>
                    <div class='aipFolderContent' id='${folderId}' style='display: block;'>
                    </div>
                </div>
            `;
            targetContainer.innerHTML += folderSection.trim();

            // Recursively load children
            this.loadAssetsImages(folder.children, folder.name, fullPath, depth + 1);
        });

        // Then add image files
        imageFiles.forEach((file) => {
            this.createImageItem(file, folderName, parentPath, depth);
        });
    },

    toggleFolder(folderId) {
        const folderContent = document.getElementById(folderId);
        const folderSection = folderContent.closest('.aipFolderSection');
        const toggleIcon = folderSection.querySelector('.aipFolderToggle');

        if (folderContent.style.display === 'none') {
            folderContent.style.display = 'block';
            toggleIcon.classList.remove('ri-arrow-right-s-line');
            toggleIcon.classList.add('ri-arrow-down-s-line');
        } else {
            folderContent.style.display = 'none';
            toggleIcon.classList.remove('ri-arrow-down-s-line');
            toggleIcon.classList.add('ri-arrow-right-s-line');
        }
    },

    createImageItem(file, folderName = null, parentPath = '', depth = 0) {
        const label = file.name.toLowerCase();
        let aipBody = document.querySelector("#animatorImagePickerBody");

        // Determine target container (folder or root)
        let targetContainer = aipBody;
        if (parentPath) {
            const folderId = parentPath.replace(/[^a-zA-Z0-9]/g, '_');
            const folderContent = document.getElementById(folderId);
            if (folderContent) {
                targetContainer = folderContent;
            }
        }

        let elem = "";
        //
        if (label.endsWith(".jpg") || label.endsWith(".jpeg") || label.endsWith(".png") || label.endsWith(".webp") || label.endsWith(".bmp")) {
            elem = `
            <div class='aipBodyItem' type = '` + file.type + `' path = '` + file.path + `' assetsPath='` + file.relativeParentPath + "/" + file.name + `'>
                <img class="local-image" src='`+ file.path + `' filename='` + file.name + `' assetsPath='` + file.relativeParentPath + "/" + file.name + `'/>
                <center>
                    <div>`+ file.name + `</div>
                </center>
            </div>`;
        }
        //show the file in the appropriate container
        targetContainer.innerHTML = targetContainer.innerHTML + elem.trim();
    },

    // ////////////
    // SAVE & LOAD
    // ////////////
    /**
     * Synchronize current frame points from UI inputs to animatorData
     */
    syncCurrentFramePointsToData() {
        if (this.cache.curAnimationId < 0 || this.cache.curFrameId < 0) {
            return; // No frame selected
        }

        const frame = this.animatorData.animations[this.cache.curAnimationId].frames[this.cache.curFrameId];

        // Sync all point inputs
        $('.afpbPoint').each((index, elem) => {
            const pointId = parseInt($(elem).attr('__ajs_frame_point_id'));
            if (pointId >= 0 && pointId < frame.points.length) {
                // Sync name
                const nameInput = $(elem).find('.afpbPointNameInput')[0];
                if (nameInput && !nameInput.hasAttribute('readonly')) {
                    frame.points[pointId].name = nameInput.value;
                }

                // Sync X position
                const xInput = $(elem).find('.afpbPointX')[0];
                if (xInput) {
                    frame.points[pointId].x = parseFloat(xInput.value) || 0;
                }

                // Sync Y position
                const yInput = $(elem).find('.afpbPointY')[0];
                if (yInput) {
                    frame.points[pointId].y = parseFloat(yInput.value) || 0;
                }

            }
        });
    },

    /**
     * Synchronize current animation properties from UI inputs to animatorData
     */
    syncCurrentAnimationPropertiesToData() {
        if (this.cache.curAnimationId < 0) {
            return; // No animation selected
        }

        const animation = this.animatorData.animations[this.cache.curAnimationId];

        // Sync animation name
        const nameInput = $('#afaName')[0];
        if (nameInput) {
            animation.name = nameInput.value || animation.name;
        }

        // Sync frame rate
        const frameRateInput = $('#afaFrameRate')[0];
        if (frameRateInput) {
            animation.frameRate = parseFloat(frameRateInput.value) || 24;
        }

        // Sync loop setting
        const loopInput = $('#afaLoop')[0];
        if (loopInput) {
            animation.loop = loopInput.checked;
        }

        // Sync start loop frame
        const startLoopFrameInput = $('#afaStartLoopFrame')[0];
        if (startLoopFrameInput) {
            animation.startLoopFrame = parseInt(startLoopFrameInput.value) || 0;
        }
    },


    /**
     * Synchronize animation events from UI to animatorData
     */
    syncCurrentAnimationEventsToData() {
        if (this.cache.curAnimationId < 0) {
            return; // No animation selected
        }

        const animation = this.animatorData.animations[this.cache.curAnimationId];

        // Events are managed through add/delete commands
        // No additional sync needed as they're updated in real-time
    },

    /**
     * Master sync function - synchronizes ALL UI state to animatorData
     */
    syncAllUIToData() {

        try {
            // Force blur on any focused input to trigger its change event
            const activeElement = document.activeElement;
            if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
                activeElement.blur();
                // Wait a tiny bit for the blur event to process
                // Note: This is synchronous, but the event handlers should update data immediately
            }

            // Sync all sections
            this.syncCurrentAnimationPropertiesToData();
            this.syncCurrentFramePointsToData();
            this.syncCurrentAnimationEventsToData();

            return true;
        } catch (err) {
            console.error('[Animator] Error during UI sync:', err);
            return false;
        }
    },

    /**
     * Save animator data to file
     */
    saveAnimator() {

        // Check if we have a path
        if (!this.cache.animatorPath) {
            console.error('[Animator] SAVE FAILED: No animator path set');
            if (typeof notifications !== 'undefined') {
                notifications.error('Failed to save: No file path');
            }
            return false;
        }

        // Check if fs is available
        if (typeof fs === 'undefined') {
            console.error('[Animator] SAVE FAILED: fs module not available');
            if (typeof notifications !== 'undefined') {
                notifications.error('Failed to save: File system not available');
            }
            return false;
        }

        // Check if we have data
        if (!this.animatorData || !this.animatorData.animations) {
            console.error('[Animator] SAVE FAILED: No animator data to save');
            if (typeof notifications !== 'undefined') {
                notifications.error('Failed to save: No data');
            }
            return false;
        }

        try {
            // CRITICAL: Sync ALL UI state to animatorData before saving
            if (!this.syncAllUIToData()) {
                throw new Error('Failed to sync UI to data');
            }

            // Validate data structure
            if (!Array.isArray(this.animatorData.animations)) {
                throw new Error('Invalid data structure: animations is not an array');
            }

            // Log what we're about to save
            if (this.cache.curAnimationId >= 0) {
                const curAnim = this.animatorData.animations[this.cache.curAnimationId];
                if (this.cache.curFrameId >= 0) {
                    const curFrame = curAnim.frames[this.cache.curFrameId];
                }
            }

            // Serialize data with proper formatting
            const jsonData = JSON.stringify(this.animatorData, null, 2);

            // Verify serialization didn't fail
            if (!jsonData || jsonData === '{}') {
                throw new Error('Serialization produced empty or invalid JSON');
            }


            // Create backup of existing file (if it exists)
            if (fs.existsSync(this.cache.animatorPath)) {
                const backupPath = this.cache.animatorPath + '.backup';
                try {
                    fs.copyFileSync(this.cache.animatorPath, backupPath);
                } catch (backupErr) {
                    console.warn('[Animator] Warning: Could not create backup:', backupErr.message);
                    // Continue anyway
                }
            }

            // Write to file
            fs.writeFileSync(this.cache.animatorPath, jsonData, 'utf8');

            // Verify the file was written
            if (!fs.existsSync(this.cache.animatorPath)) {
                throw new Error('File was not created');
            }

            const fileStats = fs.statSync(this.cache.animatorPath);

            // Verify we can read it back
            const readBack = fs.readFileSync(this.cache.animatorPath, 'utf8');
            const parsedBack = JSON.parse(readBack);

            if (!parsedBack.animations || parsedBack.animations.length !== this.animatorData.animations.length) {
                throw new Error('File verification failed: data mismatch');
            }


            // Mark as clean (no unsaved changes)
            this.isDirty = false;

            if (typeof notifications !== 'undefined') {
                notifications.success('Animation saved successfully');
            }
            return true;

        } catch (err) {
            console.error('[Animator] ========================================');
            console.error('[Animator] SAVE FAILED WITH ERROR');
            console.error('[Animator] ========================================');
            console.error('[Animator] Error:', err);
            console.error('[Animator] Error message:', err.message);
            console.error('[Animator] Stack trace:', err.stack);

            if (typeof notifications !== 'undefined') {
                notifications.error('Failed to save: ' + err.message);
            }
            return false;
        }
    },

    cancelChanges() {
        if (!this.cache.animatorPath) {
            this.closeAnimator();
            return;
        }

        try {
            // Reload the original data from file
            const data = fs.readFileSync(this.cache.animatorPath, 'utf8');
            this.animatorData = JSON.parse(data);

            // Refresh the editor to show original data
            this.refreshEditor();
            this.loadAnimator();

            if (typeof notifications !== 'undefined') {
                notifications.info('Changes cancelled');
            }
        } catch (err) {
            console.error('[Animator] Error reloading file:', err);
            if (typeof notifications !== 'undefined') {
                notifications.error('Failed to reload: ' + err.message);
            }
        }
    },

    /**
     * Close the animator with unsaved changes check
     */
    closeAnimator() {

        // Check if there are unsaved changes
        if (this.isDirty) {

            if (typeof notifications !== 'undefined') {
                // First ask if they want to save
                notifications.confirm(
                    'Unsaved Changes',
                    'You have unsaved changes. Save before closing?',
                    {
                        confirmText: 'Save',
                        cancelText: 'Don\'t Save',
                        type: 'warning'
                    }
                ).then(shouldSave => {
                    if (shouldSave) {
                        // Save and close
                        if (this.saveAnimator()) {
                            this._performCloseAnimator();
                        }
                    } else {
                        // Close without saving
                        this._performCloseAnimator();
                    }
                }).catch(() => {
                    // User cancelled
                });
            } else {
                // Fallback to native confirm dialog
                const choice = confirm('You have unsaved changes. Save before closing?\n\nOK = Save & Close\nCancel = Close Without Saving');

                if (choice) {
                    if (this.saveAnimator()) {
                        this._performCloseAnimator();
                    }
                } else {
                    this._performCloseAnimator();
                }
            }
        } else {
            // No unsaved changes, close directly
            this._performCloseAnimator();
        }
    },

    /**
     * Actually perform the close operation
     */
    _performCloseAnimator() {

        $("#animatorEditorBack").css("display", "none");
        this.cache.animatorPath = "";
        this.cache.curAnimationId = -2;
        this.cache.curFrameId = -2;
        this.isDirty = false;

        // Clear undo/redo history
        this.clearHistory();

        // Cleanup event listeners and pending timeouts
        this._cleanupEventListeners();

        // Reset point input handlers flag so they can be reattached on next open
        this._pointInputHandlersAttached = false;
        this._pointInputOriginalValues = {};

    },

    // ////////////
    // DELETE OPERATIONS
    // ////////////
    deleteAnimation(index) {
        if (index < 0 || index >= this.animatorData.animations.length) {
            console.error('[Animator] Invalid animation index:', index);
            return;
        }

        const animationName = this.animatorData.animations[index].name;

        if (typeof notifications !== 'undefined') {
            notifications.confirm(
                'Delete Animation',
                `Are you sure you want to delete "${animationName}"? This cannot be undone.`,
                { confirmText: 'Delete', cancelText: 'Cancel', type: 'danger' }
            ).then(confirmed => {
                if (confirmed) {
                    this._performDeleteAnimation(index);
                }
            });
        } else {
            if (confirm(`Are you sure you want to delete "${animationName}"? This cannot be undone.`)) {
                this._performDeleteAnimation(index);
            }
        }
    },

    _performDeleteAnimation(index) {
        const command = this.createDeleteAnimationCommand(index);
        this.executeCommand(command);

        if (typeof notifications !== 'undefined') {
            notifications.success('Animation deleted successfully');
        }
    },

    deleteFrame(animationIndex, frameIndex) {
        if (animationIndex < 0 || animationIndex >= this.animatorData.animations.length) {
            console.error('[Animator] Invalid animation index:', animationIndex);
            return;
        }

        const animation = this.animatorData.animations[animationIndex];
        if (frameIndex < 0 || frameIndex >= animation.frames.length) {
            console.error('[Animator] Invalid frame index:', frameIndex);
            return;
        }

        if (typeof notifications !== 'undefined') {
            notifications.confirm(
                'Delete Frame',
                `Are you sure you want to delete this frame? You can undo this action with Ctrl+Z.`,
                { confirmText: 'Delete', cancelText: 'Cancel', type: 'danger' }
            ).then(confirmed => {
                if (confirmed) {
                    this._performDeleteFrame(animationIndex, frameIndex);
                }
            });
        } else {
            if (confirm('Are you sure you want to delete this frame? You can undo this action with Ctrl+Z.')) {
                this._performDeleteFrame(animationIndex, frameIndex);
            }
        }
    },

    _performDeleteFrame(animationIndex, frameIndex) {
        const command = this.createDeleteFrameCommand(animationIndex, frameIndex);
        this.executeCommand(command);

        if (typeof notifications !== 'undefined') {
            notifications.success('Frame deleted successfully');
        }
    },

    deleteMultipleFrames(animationIndex, frameIndices) {
        if (animationIndex < 0 || animationIndex >= this.animatorData.animations.length) {
            console.error('[Animator] Invalid animation index:', animationIndex);
            return;
        }

        if (!frameIndices || frameIndices.length === 0) {
            console.warn('[Animator] No frames to delete');
            return;
        }

        const frameCount = frameIndices.length;
        const message = `Are you sure you want to delete ${frameCount} frame${frameCount > 1 ? 's' : ''}? You can undo this action with Ctrl+Z.`;

        if (typeof notifications !== 'undefined') {
            notifications.confirm(
                'Delete Frames',
                message,
                { confirmText: 'Delete All', cancelText: 'Cancel', type: 'danger' }
            ).then(confirmed => {
                if (confirmed) {
                    this._performDeleteMultipleFrames(animationIndex, frameIndices);
                }
            });
        } else {
            if (confirm(message)) {
                this._performDeleteMultipleFrames(animationIndex, frameIndices);
            }
        }
    },

    _performDeleteMultipleFrames(animationIndex, frameIndices) {
        const command = this.createDeleteMultipleFramesCommand(animationIndex, frameIndices);
        this.executeCommand(command);

        if (typeof notifications !== 'undefined') {
            notifications.success(`${frameIndices.length} frame(s) deleted successfully`);
        }
    },

    /**
     * Add multiple frames from image paths
     */
    addMultipleFrames(imagePaths) {
        if (this.cache.curAnimationId < 0) {
            console.warn('[Animator] No animation selected');
            return;
        }

        if (!imagePaths || imagePaths.length === 0) {
            console.warn('[Animator] No images to add');
            return;
        }

        const $self = this;

        // Convert full paths to asset paths and get image dimensions
        const frameDataArray = [];

        // Create a temporary image element to get dimensions
        let loadedCount = 0;
        const totalCount = imagePaths.length;

        imagePaths.forEach((fullPath, index) => {
            const img = new Image();
            img.onload = function() {
                // Convert absolute path to relative path using application method
                const assetsPath = application.getResourcesPathFromFile(fullPath);

                frameDataArray.push({
                    path: assetsPath,
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                    index: index  // Keep original order
                });

                loadedCount++;

                // When all images are loaded, create the command
                if (loadedCount === totalCount) {
                    // Sort by original index to maintain order
                    frameDataArray.sort((a, b) => a.index - b.index);

                    const insertIndex = $self.cache.curFrameId >= 0
                        ? $self.cache.curFrameId + 1
                        : $self.animatorData.animations[$self.cache.curAnimationId].frames.length;

                    const command = $self.createAddMultipleFramesCommand(
                        $self.cache.curAnimationId,
                        insertIndex,
                        frameDataArray
                    );

                    $self.executeCommand(command);

                    if (typeof notifications !== 'undefined') {
                        notifications.success(`${totalCount} frame(s) added`);
                    }
                }
            };
            img.src = fullPath;
        });
    },

    /**
     * Copy selected frames to clipboard
     */
    copySelectedFrames() {
        if (this.cache.curAnimationId < 0) {
            console.warn('[Animator] No animation selected');
            return;
        }

        if (this.cache.selectedFrames.length === 0) {
            console.warn('[Animator] No frames selected to copy');
            if (typeof notifications !== 'undefined') {
                notifications.info('No frames selected to copy');
            }
            return;
        }

        const animation = this.animatorData.animations[this.cache.curAnimationId];

        // Sort indices to maintain order
        const sortedIndices = [...this.cache.selectedFrames].sort((a, b) => a - b);

        // Deep copy frames
        this.clipboard.frames = sortedIndices.map(index => {
            return JSON.parse(JSON.stringify(animation.frames[index]));
        });
        this.clipboard.type = 'frames';


        if (typeof notifications !== 'undefined') {
            notifications.success(`${this.clipboard.frames.length} frame(s) copied`);
        }
    },

    /**
     * Paste frames from clipboard
     */
    pasteFrames() {
        if (this.cache.curAnimationId < 0) {
            console.warn('[Animator] No animation selected');
            return;
        }

        if (!this.clipboard.frames || this.clipboard.frames.length === 0) {
            console.warn('[Animator] Nothing to paste');
            if (typeof notifications !== 'undefined') {
                notifications.info('Nothing to paste. Copy frames first.');
            }
            return;
        }

        // Insert after current frame (or at end if no frame selected)
        let insertIndex = this.cache.curFrameId >= 0
            ? this.cache.curFrameId + 1
            : this.animatorData.animations[this.cache.curAnimationId].frames.length;

        const command = this.createPasteFramesCommand(
            this.cache.curAnimationId,
            insertIndex,
            this.clipboard.frames
        );

        this.executeCommand(command);

        if (typeof notifications !== 'undefined') {
            notifications.success(`${this.clipboard.frames.length} frame(s) pasted`);
        }
    },

    deleteFramePoint(pointIndex) {
        if (this.cache.curAnimationId < 0 || this.cache.curFrameId < 0) {
            console.error('[Animator] No frame selected');
            return;
        }

        const frame = this.animatorData.animations[this.cache.curAnimationId].frames[this.cache.curFrameId];
        if (pointIndex < 0 || pointIndex >= frame.points.length) {
            console.error('[Animator] Invalid point index:', pointIndex);
            return;
        }

        const point = frame.points[pointIndex];

        // Check if point is removable
        if (!point.removable) {
            if (typeof notifications !== 'undefined') {
                notifications.warning('This point cannot be removed');
            }
            return;
        }

        if (typeof notifications !== 'undefined') {
            notifications.confirm(
                'Delete Point',
                `Are you sure you want to delete point "${point.name}"?`,
                { confirmText: 'Delete', cancelText: 'Cancel', type: 'danger' }
            ).then(confirmed => {
                if (confirmed) {
                    this._performDeleteFramePoint(pointIndex);
                }
            });
        } else {
            if (confirm(`Are you sure you want to delete point "${point.name}"?`)) {
                this._performDeleteFramePoint(pointIndex);
            }
        }
    },

    _performDeleteFramePoint(pointIndex) {
        const command = this.createDeletePointCommand(pointIndex);
        this.executeCommand(command);

        if (typeof notifications !== 'undefined') {
            notifications.success('Point deleted successfully');
        }
    },

    // ////////////
    // ADD OPERATIONS
    // ////////////
    addFramePoint() {
        if (this.cache.curAnimationId < 0 || this.cache.curFrameId < 0) {
            console.error('[Animator] No frame selected');
            if (typeof notifications !== 'undefined') {
                notifications.warning('Please select a frame first');
            }
            return;
        }

        const command = this.createAddPointCommand();
        this.executeCommand(command);

        if (typeof notifications !== 'undefined') {
            notifications.success('Point added successfully');
        }
    },

    // ////////////
    // ANIMATION PLAYBACK PREVIEW
    // ////////////
    playbackState: {
        isPlaying: false,
        currentFrame: 0,
        intervalId: null,
        animationFrameId: null, // For requestAnimationFrame
        startTime: null,
        currentTime: 0,
        loopCount: 0,
        smoothProgress: 0 // For smooth playhead interpolation (0-1 between frames)
    },

    playAnimationPreview() {
        if (this.cache.curAnimationId < 0) {
            if (typeof notifications !== 'undefined') {
                notifications.warning('Please select an animation first');
            }
            return;
        }

        const animation = this.animatorData.animations[this.cache.curAnimationId];

        if (!animation.frames || animation.frames.length === 0) {
            if (typeof notifications !== 'undefined') {
                notifications.warning('This animation has no frames');
            }
            return;
        }

        // Toggle play/pause
        if (this.playbackState.isPlaying) {
            this.stopAnimationPreview();
        } else {
            this.startAnimationPreview();
        }
    },

    startAnimationPreview() {
        const animation = this.animatorData.animations[this.cache.curAnimationId];
        const frameRate = animation.frameRate || 30;

        this.playbackState.isPlaying = true;
        this.playbackState.currentFrame = 0;
        this.playbackState.loopCount = 0;
        this.playbackState.startTime = null; // Will be set on first RAF callback
        this.playbackState.currentTime = 0;
        this.playbackState.smoothProgress = 0;

        // Update button text
        $("#animatorFramesActionsBody button:contains('Play animation')").text('Stop animation');

        // Start smooth animation loop with requestAnimationFrame
        this._startSmoothAnimationLoop();

    },

    /**
     * Smooth animation loop using requestAnimationFrame
     * Provides 60fps playhead movement while changing frames at the correct frame rate
     */
    _startSmoothAnimationLoop() {
        const $self = this;

        const animate = (timestamp) => {
            if (!$self.playbackState.isPlaying) {
                return;
            }

            const animation = $self.animatorData.animations[$self.cache.curAnimationId];
            if (!animation || !animation.frames || animation.frames.length === 0) {
                $self.stopAnimationPreview();
                return;
            }

            const frameRate = animation.frameRate || 30;
            const frameDuration = 1000 / frameRate; // Duration in ms per frame

            // Initialize start time on first frame
            if ($self.playbackState.startTime === null) {
                $self.playbackState.startTime = timestamp;
            }

            // Calculate elapsed time
            const elapsed = timestamp - $self.playbackState.startTime;
            $self.playbackState.currentTime = elapsed;

            // Calculate which frame we should be on based on elapsed time
            const totalFrameProgress = elapsed / frameDuration;
            const targetFrameIndex = Math.floor(totalFrameProgress);
            const frameProgress = totalFrameProgress - targetFrameIndex; // 0-1 within current frame

            // Store smooth progress for playhead interpolation
            $self.playbackState.smoothProgress = frameProgress;

            // Check if we need to change the displayed frame
            if (targetFrameIndex !== $self.playbackState.currentFrame) {
                // Handle end of animation
                if (targetFrameIndex >= animation.frames.length) {
                    if (animation.loop) {
                        // Loop back to start loop frame
                        const startLoopFrame = animation.startLoopFrame || 0;
                        $self.playbackState.currentFrame = startLoopFrame;
                        $self.playbackState.loopCount++;

                        // Reset start time for smooth loop
                        $self.playbackState.startTime = timestamp;
                        $self.playbackState.currentTime = 0;
                    } else {
                        // Stop at end
                        $self.stopAnimationPreview();
                        return;
                    }
                } else {
                    // Move to next frame
                    $self.playbackState.currentFrame = targetFrameIndex;
                }

                // Update the displayed frame
                const frame = animation.frames[$self.playbackState.currentFrame];
                if (frame) {
                    const aibImg = $('#aibImg')[0];
                    if (aibImg) {
                        aibImg.src = application.getFilePathFromResources(frame.path);
                    }

                    // Update points for current frame
                    $self.cache.curFrameId = $self.playbackState.currentFrame;
                    $self.loadCurrentFramePoints();

                    // Highlight current frame in the timeline
                    $('.afBodyItem').removeClass('selected');
                    $(`.afBodyItem[__ajs_animation_frame_id="${$self.playbackState.currentFrame}"]`).addClass('selected');

                    // Trigger animation events for this frame
                    $self.triggerAnimationEvent($self.playbackState.currentFrame);
                }
            }

            // Update playhead position smoothly (every frame, not just on frame changes)
            $self.updateSmoothPlayheadPosition();

            // Continue animation loop
            $self.playbackState.animationFrameId = requestAnimationFrame(animate);
        };

        // Start the animation loop
        this.playbackState.animationFrameId = requestAnimationFrame(animate);
    },

    stopAnimationPreview() {
        // Cancel requestAnimationFrame if active
        if (this.playbackState.animationFrameId) {
            cancelAnimationFrame(this.playbackState.animationFrameId);
            this.playbackState.animationFrameId = null;
        }

        // Clear interval if using old system (backward compatibility)
        if (this.playbackState.intervalId) {
            clearInterval(this.playbackState.intervalId);
            this.playbackState.intervalId = null;
        }

        this.playbackState.isPlaying = false;
        this.playbackState.smoothProgress = 0;

        // Update button text
        $("#animatorFramesActionsBody button:contains('Stop animation')").text('Play animation');

    },

    // ////////////
    // TIMELINE
    // ////////////
    loadTimeline() {
        if (this.cache.curAnimationId < 0) {
            $('#timelineFrames').empty();
            this.updateTimelineInfo(0, 0, 0, 0);
            return;
        }

        const animation = this.animatorData.animations[this.cache.curAnimationId];
        const frames = animation.frames || [];
        const frameRate = animation.frameRate || 30;

        // Clear timeline
        $('#timelineFrames').empty();

        // Add frames to timeline
        frames.forEach((frame, index) => {
            const framePath = application.getFilePathFromResources(frame.path);
            const frameTime = (index / frameRate).toFixed(2);

            const frameElement = `
                <div class="timeline-frame ${index === this.cache.curFrameId ? 'selected' : ''}" data-frame-index="${index}">
                    <img src="${framePath}" class="no-antialiasing">
                    <div class="timeline-frame-number">${index}</div>
                </div>
            `;

            $('#timelineFrames').append(frameElement);
        });

        // Update timeline info
        const totalDuration = frames.length / frameRate;
        const currentTime = this.cache.curFrameId / frameRate;
        this.updateTimelineInfo(this.cache.curFrameId, frames.length, currentTime, totalDuration);

        // Update playhead position
        this.updatePlayheadPosition();

        // Add click handlers
        const $self = this;
        $('.timeline-frame').click(function () {
            const frameIndex = parseInt($(this).data('frame-index'));
            $self.jumpToFrame(frameIndex);
        });
    },

    updateTimelineInfo(currentFrame, totalFrames, currentTime, totalTime) {
        $('#timelineCurrentFrameLabel').text(`Frame: ${currentFrame} / ${totalFrames}`);
        $('#timelineCurrentTimeLabel').text(`${currentTime.toFixed(2)}s / ${totalTime.toFixed(2)}s`);
    },

    /**
     * Update playhead position with smooth interpolation during playback
     * This is called every frame during animation playback for 60fps smoothness
     */
    updateSmoothPlayheadPosition() {
        if (this.cache.curFrameId < 0) {
            $('#timelinePlayhead').css('left', '0px');
            return;
        }

        const frameWidth = 60 + 4; // frame width + gap

        // Calculate smooth position using interpolation
        const currentFrameBase = this.playbackState.currentFrame * frameWidth;
        const nextFrameOffset = frameWidth * this.playbackState.smoothProgress;
        const smoothPlayheadPos = currentFrameBase + nextFrameOffset + (frameWidth / 2);

        $('#timelinePlayhead').css('left', smoothPlayheadPos + 'px');

        // Scroll timeline to keep playhead visible (smooth scroll)
        const timelineBody = $('#animatorTimelineBody')[0];
        if (timelineBody) {
            const scrollPos = smoothPlayheadPos - (timelineBody.clientWidth / 2);
            timelineBody.scrollLeft = Math.max(0, scrollPos);
        }

        // Update timeline info with smooth time
        if (this.cache.curAnimationId >= 0) {
            const animation = this.animatorData.animations[this.cache.curAnimationId];
            const frameRate = animation.frameRate || 30;
            const frames = animation.frames || [];

            // Calculate smooth current time
            const smoothFramePosition = this.playbackState.currentFrame + this.playbackState.smoothProgress;
            const currentTime = smoothFramePosition / frameRate;
            const totalDuration = frames.length / frameRate;

            this.updateTimelineInfo(this.playbackState.currentFrame, frames.length, currentTime, totalDuration);
        }
    },

    updatePlayheadPosition() {
        if (this.cache.curFrameId < 0) {
            $('#timelinePlayhead').css('left', '0px');
            return;
        }

        const frameWidth = 60 + 4; // frame width + gap
        const playheadPos = this.cache.curFrameId * frameWidth + (frameWidth / 2);
        $('#timelinePlayhead').css('left', playheadPos + 'px');

        // Scroll timeline to keep playhead visible
        const timelineBody = $('#animatorTimelineBody')[0];
        if (timelineBody) {
            const scrollPos = playheadPos - (timelineBody.clientWidth / 2);
            timelineBody.scrollLeft = Math.max(0, scrollPos);
        }
    },

    jumpToFrame(frameIndex) {
        if (this.cache.curAnimationId < 0) return;

        const animation = this.animatorData.animations[this.cache.curAnimationId];
        if (frameIndex < 0 || frameIndex >= animation.frames.length) return;

        // Update cache
        this.cache.curFrameId = frameIndex;

        // Update main image view
        this.loadCurrentAnimationImage();

        // Update timeline selection
        $('.timeline-frame').removeClass('selected');
        $(`.timeline-frame[data-frame-index="${frameIndex}"]`).addClass('selected');

        // Update vertical frame list selection
        $('.afBodyItem').removeClass('selected');
        $(`.afBodyItem[__ajs_animation_frame_id="${frameIndex}"]`).addClass('selected');

        // Update playhead
        this.updatePlayheadPosition();

        // Update timeline info
        const frameRate = animation.frameRate || 30;
        const totalDuration = animation.frames.length / frameRate;
        const currentTime = frameIndex / frameRate;
        this.updateTimelineInfo(frameIndex, animation.frames.length, currentTime, totalDuration);

        // Update onion skinning if enabled
        this.updateOnionSkinning();
    },

    jumpToFirstFrame() {
        this.jumpToFrame(0);
    },

    jumpToLastFrame() {
        if (this.cache.curAnimationId < 0) return;
        const animation = this.animatorData.animations[this.cache.curAnimationId];
        this.jumpToFrame(animation.frames.length - 1);
    },

    // ////////////
    // ONION SKINNING
    // ////////////
    updateOnionSkinning() {
        // Clear existing onion skin layers
        $('.onion-skin-layer').remove();

        const enabled = $('#onionSkinningEnabled')[0]?.checked;
        if (!enabled || this.cache.curAnimationId < 0 || this.cache.curFrameId < 0) {
            return;
        }

        const animation = this.animatorData.animations[this.cache.curAnimationId];
        const frameCount = parseInt($('#onionSkinningFrames').val()) || 2;
        const currentFrame = this.cache.curFrameId;

        // Add previous frames as onion skins
        for (let i = 1; i <= frameCount; i++) {
            const frameIndex = currentFrame - i;
            if (frameIndex >= 0 && frameIndex < animation.frames.length) {
                const frame = animation.frames[frameIndex];
                const framePath = application.getFilePathFromResources(frame.path);
                const opacity = 0.3 / i; // Fade out older frames

                const layer = `
                    <div class="onion-skin-layer" style="opacity: ${opacity};">
                        <img src="${framePath}" class="no-antialiasing">
                    </div>
                `;

                $('#animatorImageBox').prepend(layer);
            }
        }

        // Add next frames as onion skins (lighter color)
        for (let i = 1; i <= frameCount; i++) {
            const frameIndex = currentFrame + i;
            if (frameIndex >= 0 && frameIndex < animation.frames.length) {
                const frame = animation.frames[frameIndex];
                const framePath = application.getFilePathFromResources(frame.path);
                const opacity = 0.2 / i; // Even lighter for future frames

                const layer = `
                    <div class="onion-skin-layer" style="opacity: ${opacity}; filter: hue-rotate(120deg);">
                        <img src="${framePath}" class="no-antialiasing">
                    </div>
                `;

                $('#animatorImageBox').prepend(layer);
            }
        }
    },

    // ////////////
    // FRAME BLENDING
    // ////////////
    updateFrameBlending() {
        // Clear existing frame blend layers
        $('.frame-blend-layer').remove();

        const enabled = $('#frameBlendingEnabled')[0]?.checked;
        if (!enabled || this.cache.curAnimationId < 0 || this.cache.curFrameId < 0) {
            return;
        }

        const animation = this.animatorData.animations[this.cache.curAnimationId];
        const currentFrame = this.cache.curFrameId;
        const blendAmount = parseInt($('#frameBlendingAmount').val()) / 100 || 0.5;

        // Blend with next frame
        const nextFrameIndex = currentFrame + 1;
        if (nextFrameIndex < animation.frames.length) {
            const nextFrame = animation.frames[nextFrameIndex];
            const nextFramePath = application.getFilePathFromResources(nextFrame.path);

            const layer = `
                <div class="frame-blend-layer" style="opacity: ${blendAmount}; mix-blend-mode: lighten;">
                    <img src="${nextFramePath}" class="no-antialiasing">
                </div>
            `;

            $('#animatorImageBox').append(layer);
        }
    },

    // ////////////
    // ANIMATION EVENTS
    // ////////////
    loadAnimationEvents() {
        if (this.cache.curAnimationId < 0) {
            $('#animationEventsList').empty();
            return;
        }

        const animation = this.animatorData.animations[this.cache.curAnimationId];

        // Initialize events array if it doesn't exist
        if (!animation.events) {
            animation.events = [];
        }

        // Clear events list
        $('#animationEventsList').empty();

        // Load all events
        animation.events.forEach((event, index) => {
            this._createEventElement(event, index);
        });

        // Update event markers on timeline
        this.updateTimelineEventMarkers();
    },

    _createEventElement(event, index) {
        const eventHTML = `
            <div class="animation-event-item" data-event-index="${index}">
                <div class="animation-event-header">
                    <label>Event ${index + 1}</label>
                    <i class="ri-delete-bin-fill" data-event-index="${index}"></i>
                </div>
                <div class="animation-event-field">
                    <label>Frame:</label>
                    <input type="number" class="event-frame-input" value="${event.frame || 0}" min="0" data-event-index="${index}">
                </div>
                <div class="animation-event-field">
                    <label>Event Name:</label>
                    <input type="text" class="event-name-input" value="${event.name || ''}" placeholder="e.g., onFootstep" data-event-index="${index}">
                </div>
                <div class="animation-event-field">
                    <label>Parameters:</label>
                    <textarea class="event-params-input" placeholder='{"volume": 1.0}' data-event-index="${index}">${event.params || ''}</textarea>
                </div>
            </div>
        `;

        $('#animationEventsList').append(eventHTML);

        // Add event handlers
        const $self = this;

        // Delete event
        $(`.animation-event-item[data-event-index="${index}"] i.ri-delete-bin-fill`).click(function () {
            $self.deleteAnimationEvent(index);
        });

        // Update event frame
        $(`.event-frame-input[data-event-index="${index}"]`).on('input change', function () {
            const animation = $self.animatorData.animations[$self.cache.curAnimationId];
            animation.events[index].frame = parseInt(this.value) || 0;
            $self.updateTimelineEventMarkers();
        });

        // Update event name
        $(`.event-name-input[data-event-index="${index}"]`).on('input change', function () {
            const animation = $self.animatorData.animations[$self.cache.curAnimationId];
            animation.events[index].name = this.value;
        });

        // Update event params
        $(`.event-params-input[data-event-index="${index}"]`).on('input change', function () {
            const animation = $self.animatorData.animations[$self.cache.curAnimationId];
            animation.events[index].params = this.value;
        });
    },

    addAnimationEvent() {
        if (this.cache.curAnimationId < 0) {
            if (typeof notifications !== 'undefined') {
                notifications.warning('Please select an animation first');
            }
            return;
        }

        const animation = this.animatorData.animations[this.cache.curAnimationId];

        // Initialize events array if it doesn't exist
        if (!animation.events) {
            animation.events = [];
        }

        const command = this.createAddEventCommand();
        this.executeCommand(command);

        if (typeof notifications !== 'undefined') {
            notifications.success('Event added successfully');
        }
    },

    deleteAnimationEvent(index) {
        if (this.cache.curAnimationId < 0) return;

        const animation = this.animatorData.animations[this.cache.curAnimationId];

        if (typeof notifications !== 'undefined') {
            notifications.confirm(
                'Delete Event',
                `Are you sure you want to delete this animation event?`,
                { confirmText: 'Delete', cancelText: 'Cancel', type: 'danger' }
            ).then(confirmed => {
                if (confirmed) {
                    const command = this.createDeleteEventCommand(index);
                    this.executeCommand(command);
                    notifications.success('Event deleted successfully');
                }
            });
        } else {
            if (confirm('Are you sure you want to delete this animation event?')) {
                const command = this.createDeleteEventCommand(index);
                this.executeCommand(command);
            }
        }
    },

    updateTimelineEventMarkers() {
        // Remove existing markers
        $('.timeline-event-marker').remove();

        if (this.cache.curAnimationId < 0) return;

        const animation = this.animatorData.animations[this.cache.curAnimationId];
        if (!animation.events) return;

        const frameWidth = 60 + 4; // frame width + gap

        animation.events.forEach((event, index) => {
            const frameIndex = event.frame || 0;
            const markerPos = frameIndex * frameWidth + (frameWidth / 2) - 4; // Center the marker

            const marker = `
                <div class="timeline-event-marker" style="left: ${markerPos}px;" data-event-index="${index}" title="${event.name}"></div>
            `;

            $('#timelineTrack').append(marker);
        });

        // Add click handler to jump to event frame
        const $self = this;
        $('.timeline-event-marker').click(function () {
            const eventIndex = parseInt($(this).data('event-index'));
            const event = animation.events[eventIndex];
            if (event) {
                $self.jumpToFrame(event.frame);
            }
        });
    },

    triggerAnimationEvent(frame) {
        if (this.cache.curAnimationId < 0) return;

        const animation = this.animatorData.animations[this.cache.curAnimationId];
        if (!animation.events) return;

        // Find events that should trigger on this frame
        const eventsToTrigger = animation.events.filter(event => event.frame === frame);

        eventsToTrigger.forEach(event => {

            // Parse params if they exist
            let params = {};
            if (event.params) {
                try {
                    params = JSON.parse(event.params);
                } catch (e) {
                    console.warn('[Animator] Failed to parse event params:', event.params);
                }
            }

            // Emit custom event that can be listened to
            const customEvent = new CustomEvent('animationEvent', {
                detail: {
                    eventName: event.name,
                    frame: frame,
                    params: params,
                    animationId: this.cache.curAnimationId
                }
            });

            document.dispatchEvent(customEvent);

            // Show notification
            if (typeof notifications !== 'undefined') {
                notifications.info(`Event: ${event.name}`);
            }
        });
    },

    // ////////////
    // UNDO/REDO SYSTEM
    // ////////////

    /**
     * Execute a command and add it to history
     * @param {Object} command - Command object with execute() and undo() methods
     */
    executeCommand(command) {
        if (this.commandHistory.isExecuting) {
            console.warn('[Animator] Skipping executeCommand during undo/redo:', command.name);
            return;
        }


        // Execute the command
        try {
            command.execute();
        } catch (error) {
            console.error('[Animator] Command execution failed:', error);
            if (typeof notifications !== 'undefined') {
                notifications.error('Operation failed: ' + error.message);
            }
            return;
        }

        // Add to undo stack
        this.commandHistory.undoStack.push(command);

        // Limit history size
        if (this.commandHistory.undoStack.length > this.commandHistory.maxHistorySize) {
            this.commandHistory.undoStack.shift();
        }

        // Clear redo stack (can't redo after new action)
        this.commandHistory.redoStack = [];

        // Mark as dirty (unsaved changes)
        this.isDirty = true;

        // Update undo/redo button states
        this.updateUndoRedoButtons();
    },

    /**
     * Undo the last command
     */
    undo() {
        if (this.commandHistory.undoStack.length === 0) {
            if (typeof notifications !== 'undefined') {
                notifications.warning('Nothing to undo');
            }
            return;
        }

        const command = this.commandHistory.undoStack[this.commandHistory.undoStack.length - 1];

        this.commandHistory.isExecuting = true;

        try {
            this.commandHistory.undoStack.pop();
            command.undo();
            this.commandHistory.redoStack.push(command);
        } catch (error) {
            console.error('[Animator] Undo failed:', error);
            // Restore to undo stack if undo failed
            this.commandHistory.undoStack.push(command);
            if (typeof notifications !== 'undefined') {
                notifications.error('Undo failed: ' + error.message);
            }
        }

        this.commandHistory.isExecuting = false;

        // Mark as dirty (unsaved changes)
        this.isDirty = true;

        this.updateUndoRedoButtons();

        if (typeof notifications !== 'undefined') {
            notifications.info(`Undo: ${command.name}`);
        }
    },

    /**
     * Redo the last undone command
     */
    redo() {
        if (this.commandHistory.redoStack.length === 0) {
            if (typeof notifications !== 'undefined') {
                notifications.warning('Nothing to redo');
            }
            return;
        }

        const command = this.commandHistory.redoStack[this.commandHistory.redoStack.length - 1];

        this.commandHistory.isExecuting = true;

        try {
            this.commandHistory.redoStack.pop();
            command.execute();
            this.commandHistory.undoStack.push(command);
        } catch (error) {
            console.error('[Animator] Redo failed:', error);
            // Restore to redo stack if redo failed
            this.commandHistory.redoStack.push(command);
            if (typeof notifications !== 'undefined') {
                notifications.error('Redo failed: ' + error.message);
            }
        }

        this.commandHistory.isExecuting = false;

        // Mark as dirty (unsaved changes)
        this.isDirty = true;

        this.updateUndoRedoButtons();

        if (typeof notifications !== 'undefined') {
            notifications.info(`Redo: ${command.name}`);
        }
    },

    /**
     * Clear command history
     */
    clearHistory() {
        this.commandHistory.undoStack = [];
        this.commandHistory.redoStack = [];
        this.updateUndoRedoButtons();
    },

    /**
     * Update undo/redo button states
     */
    updateUndoRedoButtons() {
        const canUndo = this.commandHistory.undoStack.length > 0;
        const canRedo = this.commandHistory.redoStack.length > 0;

        // Use attribute for icons instead of prop('disabled')
        if (canUndo) {
            $('#undoBtn').removeAttr('disabled').css('opacity', '1').css('cursor', 'pointer');
        } else {
            $('#undoBtn').attr('disabled', 'true').css('opacity', '0.3').css('cursor', 'not-allowed');
        }

        if (canRedo) {
            $('#redoBtn').removeAttr('disabled').css('opacity', '1').css('cursor', 'pointer');
        } else {
            $('#redoBtn').attr('disabled', 'true').css('opacity', '0.3').css('cursor', 'not-allowed');
        }

        // Update tooltips
        if (canUndo) {
            const lastCommand = this.commandHistory.undoStack[this.commandHistory.undoStack.length - 1];
            $('#undoBtn').attr('title', `Undo: ${lastCommand.name} (Ctrl+Z)`);
        } else {
            $('#undoBtn').attr('title', 'Undo (Ctrl+Z)');
        }

        if (canRedo) {
            const lastCommand = this.commandHistory.redoStack[this.commandHistory.redoStack.length - 1];
            $('#redoBtn').attr('title', `Redo: ${lastCommand.name} (Ctrl+Y)`);
        } else {
            $('#redoBtn').attr('title', 'Redo (Ctrl+Y)');
        }
    },

    // ////////////
    // COMMAND CLASSES
    // ////////////

    /**
     * Create a deep copy of animation data for undo/redo
     */
    _cloneAnimationData() {
        return JSON.parse(JSON.stringify(this.animatorData));
    },

    /**
     * Command: Add Animation
     */
    createAddAnimationCommand(index) {
        const $self = this;
        return {
            name: 'Add Animation',
            animationIndex: index,
            animationData: null,

            execute() {
                const newIndex = this.animationIndex === -1 ? $self.animatorData.animations.length : this.animationIndex + 1;

                const newAnimation = {
                    "name": "New Animation " + $self.animatorData.animations.length,
                    "frameRate": 30,
                    "loop": false,
                    "startLoopFrame": 0,
                    "frames": [],
                    "events": []
                };

                $self.animatorData.animations.splice(newIndex, 0, newAnimation);
                this.animationData = newAnimation;
                this.animationIndex = newIndex;

                // Force reload by setting curAnimationId to invalid value
                $self.cache.curAnimationId = -2;
                $self.loadAnimations(newIndex);
                $self.loadTimeline(); // Reload timeline after animation addition
            },

            undo() {
                $self.animatorData.animations.splice(this.animationIndex, 1);
                const targetAnimId = Math.max(0, this.animationIndex - 1);

                // Force reload by setting curAnimationId to invalid value
                $self.cache.curAnimationId = -2;
                $self.loadAnimations(targetAnimId);
                $self.loadTimeline(); // Reload timeline after animation removal
            }
        };
    },

    /**
     * Command: Delete Animation
     */
    createDeleteAnimationCommand(index) {
        const $self = this;
        const animation = JSON.parse(JSON.stringify(this.animatorData.animations[index]));

        return {
            name: `Delete Animation: ${animation.name}`,
            animationIndex: index,
            animationData: animation,

            execute() {
                $self.animatorData.animations.splice(this.animationIndex, 1);

                let targetAnimId;
                if ($self.animatorData.animations.length === 0) {
                    targetAnimId = -2;
                    $self.cache.curFrameId = -2;
                } else if (this.animationIndex === $self.cache.curAnimationId) {
                    targetAnimId = Math.max(0, this.animationIndex - 1);
                } else if (this.animationIndex < $self.cache.curAnimationId) {
                    targetAnimId = $self.cache.curAnimationId - 1;
                } else {
                    targetAnimId = $self.cache.curAnimationId;
                }

                // Force reload by setting curAnimationId to invalid value
                $self.cache.curAnimationId = -2;
                $self.loadAnimations(targetAnimId);
                $self.loadTimeline(); // Reload timeline after animation deletion
            },

            undo() {
                $self.animatorData.animations.splice(this.animationIndex, 0, this.animationData);

                // Force reload by setting curAnimationId to invalid value
                $self.cache.curAnimationId = -2;
                $self.loadAnimations(this.animationIndex);
                $self.loadTimeline(); // Reload timeline after animation restoration
            }
        };
    },

    /**
     * Command: Delete Frame
     */
    createDeleteFrameCommand(animationIndex, frameIndex) {
        const $self = this;

        // Validate indices
        if (animationIndex < 0 || animationIndex >= this.animatorData.animations.length) {
            console.error('[Animator] Invalid animation index for delete:', animationIndex);
            throw new Error('Invalid animation index');
        }

        const animation = this.animatorData.animations[animationIndex];
        if (frameIndex < 0 || frameIndex >= animation.frames.length) {
            console.error('[Animator] Invalid frame index for delete:', frameIndex);
            throw new Error('Invalid frame index');
        }

        // Create deep copy of frame data
        const frame = JSON.parse(JSON.stringify(animation.frames[frameIndex]));

        return {
            name: 'Delete Frame',
            animationIndex: animationIndex,
            frameIndex: frameIndex,
            frameData: frame,

            execute() {
                const animation = $self.animatorData.animations[this.animationIndex];

                // Delete the frame
                animation.frames.splice(this.frameIndex, 1);

                // Calculate target frame ID (but don't set curFrameId yet - let loadCurrentAnimationFrames do it)
                let targetFrameId;
                if (animation.frames.length === 0) {
                    targetFrameId = -2;
                } else if (this.frameIndex === $self.cache.curFrameId) {
                    targetFrameId = Math.max(0, this.frameIndex - 1);
                } else if (this.frameIndex < $self.cache.curFrameId) {
                    targetFrameId = $self.cache.curFrameId - 1;
                } else {
                    targetFrameId = $self.cache.curFrameId;
                }

                // Reload UI - this will update curFrameId, timeline, and all UI elements

                // Special handling for empty animation
                if (animation.frames.length === 0) {
                    $self.cache.curFrameId = -2;
                    $('#animatorFramesTitle').text('(0)');
                    let afBody = document.querySelector("#animatorFramesBody");
                    while (afBody.firstChild) {
                        afBody.removeChild(afBody.firstChild);
                    }
                    $self.loadTimeline();
                } else {
                    // Force reload by temporarily setting curFrameId to a different value
                    const oldCurFrameId = $self.cache.curFrameId;
                    $self.cache.curFrameId = -999; // Temporary invalid value to force refresh
                    $self.loadCurrentAnimationFrames(targetFrameId);
                    $self.loadTimeline(); // Reload timeline after frame deletion
                }
            },

            undo() {
                const animation = $self.animatorData.animations[this.animationIndex];

                // Restore the frame
                animation.frames.splice(this.frameIndex, 0, this.frameData);

                // Force reload by temporarily setting curFrameId to a different value
                $self.cache.curFrameId = -999; // Temporary invalid value to force refresh
                $self.loadCurrentAnimationFrames(this.frameIndex);
                $self.loadTimeline(); // Reload timeline after frame restoration
            }
        };
    },

    /**
     * Command: Delete Multiple Frames
     */
    createDeleteMultipleFramesCommand(animationIndex, frameIndices) {
        const $self = this;

        // Validate indices
        if (animationIndex < 0 || animationIndex >= this.animatorData.animations.length) {
            console.error('[Animator] Invalid animation index for delete multiple:', animationIndex);
            throw new Error('Invalid animation index');
        }

        const animation = this.animatorData.animations[animationIndex];

        // Sort indices in descending order to delete from end to beginning
        // This prevents index shifting issues
        const sortedIndices = [...frameIndices].sort((a, b) => b - a);

        // Create deep copies of frame data
        const framesData = sortedIndices.map(index => {
            if (index < 0 || index >= animation.frames.length) {
                console.error('[Animator] Invalid frame index for delete:', index);
                throw new Error('Invalid frame index');
            }
            return {
                index: index,
                data: JSON.parse(JSON.stringify(animation.frames[index]))
            };
        });


        return {
            name: `Delete ${framesData.length} Frame(s)`,
            animationIndex: animationIndex,
            framesData: framesData,

            execute() {
                const animation = $self.animatorData.animations[this.animationIndex];

                // Delete frames in descending order
                this.framesData.forEach(frameInfo => {
                    animation.frames.splice(frameInfo.index, 1);
                });


                // Clear selection
                $self.cache.selectedFrames = [];
                $self.cache.lastSelectedFrame = -1;

                // Calculate target frame ID
                let targetFrameId;
                if (animation.frames.length === 0) {
                    targetFrameId = -2;
                } else {
                    // Select the frame before the first deleted frame
                    const firstDeletedIndex = Math.min(...this.framesData.map(f => f.index));
                    targetFrameId = Math.max(0, Math.min(firstDeletedIndex, animation.frames.length - 1));
                }

                // Reload UI
                if (animation.frames.length === 0) {
                    $self.cache.curFrameId = -2;
                    $('#animatorFramesTitle').text('(0)');
                    let afBody = document.querySelector("#animatorFramesBody");
                    while (afBody.firstChild) {
                        afBody.removeChild(afBody.firstChild);
                    }
                    $self.loadTimeline();
                } else {
                    $self.cache.curFrameId = -999;
                    $self.loadCurrentAnimationFrames(targetFrameId);
                    $self.loadTimeline();
                }
            },

            undo() {
                const animation = $self.animatorData.animations[this.animationIndex];

                // Restore frames in ascending order (reverse of delete)
                const ascendingFrames = [...this.framesData].reverse();
                ascendingFrames.forEach(frameInfo => {
                    animation.frames.splice(frameInfo.index, 0, frameInfo.data);
                });


                // Clear selection
                $self.cache.selectedFrames = [];
                $self.cache.lastSelectedFrame = -1;

                // Restore to first restored frame
                const firstRestoredIndex = ascendingFrames[0].index;
                $self.cache.curFrameId = -999;
                $self.loadCurrentAnimationFrames(firstRestoredIndex);
                $self.loadTimeline();
            }
        };
    },

    /**
     * Command: Paste Frames
     */
    createPasteFramesCommand(animationIndex, insertIndex, framesToPaste) {
        const $self = this;

        // Validate
        if (animationIndex < 0 || animationIndex >= this.animatorData.animations.length) {
            console.error('[Animator] Invalid animation index for paste:', animationIndex);
            throw new Error('Invalid animation index');
        }

        // Deep copy frames to paste
        const frames = JSON.parse(JSON.stringify(framesToPaste));
        const frameCount = frames.length;


        return {
            name: `Paste ${frameCount} Frame(s)`,
            animationIndex: animationIndex,
            insertIndex: insertIndex,
            frames: frames,
            frameCount: frameCount,

            execute() {
                const animation = $self.animatorData.animations[this.animationIndex];

                // Insert frames
                animation.frames.splice(this.insertIndex, 0, ...this.frames);


                // Select first pasted frame
                const targetFrameId = this.insertIndex;
                $self.cache.curFrameId = -999;
                $self.loadCurrentAnimationFrames(targetFrameId);
                $self.loadTimeline();

                // Select all pasted frames
                $self.cache.selectedFrames = [];
                for (let i = 0; i < this.frameCount; i++) {
                    $self.cache.selectedFrames.push(this.insertIndex + i);
                    $(`.afBodyItem[__ajs_animation_frame_id="${this.insertIndex + i}"]`).addClass("selected");
                }
            },

            undo() {
                const animation = $self.animatorData.animations[this.animationIndex];

                // Remove pasted frames
                animation.frames.splice(this.insertIndex, this.frameCount);


                // Clear selection
                $self.cache.selectedFrames = [];

                // Select frame before insertion point
                let targetFrameId;
                if (animation.frames.length === 0) {
                    targetFrameId = -2;
                } else {
                    targetFrameId = Math.max(0, Math.min(this.insertIndex - 1, animation.frames.length - 1));
                }

                if (targetFrameId === -2) {
                    $self.cache.curFrameId = -2;
                    $('#animatorFramesTitle').text('(0)');
                    let afBody = document.querySelector("#animatorFramesBody");
                    while (afBody.firstChild) {
                        afBody.removeChild(afBody.firstChild);
                    }
                    $self.loadTimeline();
                } else {
                    $self.cache.curFrameId = -999;
                    $self.loadCurrentAnimationFrames(targetFrameId);
                    $self.loadTimeline();
                }
            }
        };
    },

    /**
     * Command: Add Frame (from image picker)
     */
    createAddFrameCommand(animationIndex, frameIndex, imagePath, width, height) {
        const $self = this;

        // Create the frame data
        const frameData = {
            "path": imagePath,
            "width": width,
            "height": height,
            "points": [
                {
                    "removable": false,
                    "name": "origin",
                    "x": 0,
                    "y": 0
                },
                {
                    "removable": false,
                    "name": "action",
                    "x": width / 2,
                    "y": height / 2
                }
            ]
        };


        return {
            name: 'Add Frame',
            animationIndex: animationIndex,
            frameIndex: frameIndex,
            frameData: frameData,

            execute() {
                const animation = $self.animatorData.animations[this.animationIndex];

                // Add the frame
                animation.frames.splice(this.frameIndex, 0, this.frameData);

                // Update current frame to the newly added frame

                // Force reload by setting curFrameId to invalid value
                $self.cache.curFrameId = -999;
                $self.loadCurrentAnimationFrames(this.frameIndex);
                $self.loadTimeline(); // Reload timeline after frame addition
            },

            undo() {
                const animation = $self.animatorData.animations[this.animationIndex];

                // Remove the frame
                animation.frames.splice(this.frameIndex, 1);

                // Adjust current frame selection
                let targetFrameId;
                if ($self.cache.curFrameId === this.frameIndex) {
                    targetFrameId = Math.max(0, this.frameIndex - 1);
                } else if ($self.cache.curFrameId > this.frameIndex) {
                    targetFrameId = $self.cache.curFrameId - 1;
                } else {
                    targetFrameId = $self.cache.curFrameId;
                }

                // Force reload by setting curFrameId to invalid value
                $self.cache.curFrameId = -999;
                $self.loadCurrentAnimationFrames(targetFrameId);
                $self.loadTimeline(); // Reload timeline after frame removal
            }
        };
    },

    /**
     * Command: Add Multiple Frames
     */
    createAddMultipleFramesCommand(animationIndex, insertIndex, frameDataArray) {
        const $self = this;

        // Create frame objects from the data array
        const frames = frameDataArray.map(data => ({
            "path": data.path,
            "width": data.width,
            "height": data.height,
            "points": [
                {
                    "removable": false,
                    "name": "origin",
                    "x": 0,
                    "y": 0
                },
                {
                    "removable": false,
                    "name": "action",
                    "x": data.width / 2,
                    "y": data.height / 2
                }
            ]
        }));

        const frameCount = frames.length;

        return {
            name: `Add ${frameCount} Frame(s)`,
            animationIndex: animationIndex,
            insertIndex: insertIndex,
            frames: frames,
            frameCount: frameCount,

            execute() {
                const animation = $self.animatorData.animations[this.animationIndex];

                // Insert frames
                animation.frames.splice(this.insertIndex, 0, ...this.frames);


                // Select first added frame
                const targetFrameId = this.insertIndex;
                $self.cache.curFrameId = -999;
                $self.loadCurrentAnimationFrames(targetFrameId);
                $self.loadTimeline();

                // Select all added frames
                $self.cache.selectedFrames = [];
                for (let i = 0; i < this.frameCount; i++) {
                    $self.cache.selectedFrames.push(this.insertIndex + i);
                }

                // Clear image selection
                $self.cache.selectedImages = [];
                $(".aipBodyItem").removeClass("selected");
            },

            undo() {
                const animation = $self.animatorData.animations[this.animationIndex];

                // Remove added frames
                animation.frames.splice(this.insertIndex, this.frameCount);


                // Clear selection
                $self.cache.selectedFrames = [];

                // Select frame before insertion point
                let targetFrameId = Math.max(0, Math.min(this.insertIndex - 1, animation.frames.length - 1));

                if (animation.frames.length === 0) {
                    targetFrameId = -2;
                }

                if (targetFrameId === -2) {
                    $self.cache.curFrameId = -2;
                    $('#animatorFramesTitle').text('(0)');
                    let afBody = document.querySelector("#animatorFramesBody");
                    while (afBody.firstChild) {
                        afBody.removeChild(afBody.firstChild);
                    }
                    $self.loadTimeline();
                } else {
                    $self.cache.curFrameId = -999;
                    $self.loadCurrentAnimationFrames(targetFrameId);
                    $self.loadTimeline();
                }
            }
        };
    },

    /**
     * Command: Add Frame Point
     */
    createAddPointCommand() {
        const $self = this;
        const frame = this.animatorData.animations[this.cache.curAnimationId].frames[this.cache.curFrameId];

        return {
            name: 'Add Point',
            animationIndex: $self.cache.curAnimationId,
            frameIndex: $self.cache.curFrameId,
            pointData: {
                "removable": true,
                "name": "Point " + frame.points.length,
                "x": frame.width / 2,
                "y": frame.height / 2
            },

            execute() {
                const frame = $self.animatorData.animations[this.animationIndex].frames[this.frameIndex];
                frame.points.push(this.pointData);
                $self.loadCurrentFramePoints();
            },

            undo() {
                const frame = $self.animatorData.animations[this.animationIndex].frames[this.frameIndex];
                frame.points.pop();
                $self.loadCurrentFramePoints();
            }
        };
    },

    /**
     * Command: Insert Tween Frames
     */
    createInsertTweenFramesCommand(afterFrameIndex, tweenFrames) {
        const $self = this;

        return {
            name: 'Insert Tween Frames',
            animationIndex: $self.cache.curAnimationId,
            afterFrameIndex: afterFrameIndex,
            tweenFrames: JSON.parse(JSON.stringify(tweenFrames)), // Deep clone
            tweenCount: tweenFrames.length,

            execute() {
                const animation = $self.animatorData.animations[this.animationIndex];

                // Insert all tween frames after the specified frame
                const insertIndex = this.afterFrameIndex + 1;
                animation.frames.splice(insertIndex, 0, ...this.tweenFrames);


                // Select the first inserted tween frame
                $self.cache.curFrameId = -999; // Force reload
                $self.loadCurrentAnimationFrames(insertIndex);
                $self.loadTimeline(); // Reload timeline after insertion
            },

            undo() {
                const animation = $self.animatorData.animations[this.animationIndex];

                // Remove all the inserted tween frames
                const insertIndex = this.afterFrameIndex + 1;
                animation.frames.splice(insertIndex, this.tweenCount);


                // Select the frame that was before the tweens
                $self.cache.curFrameId = -999; // Force reload
                $self.loadCurrentAnimationFrames(this.afterFrameIndex);
                $self.loadTimeline(); // Reload timeline after removal
            }
        };
    },

    /**
     * Command: Delete Frame Point
     */
    createDeletePointCommand(pointIndex) {
        const $self = this;
        const frame = this.animatorData.animations[this.cache.curAnimationId].frames[this.cache.curFrameId];
        const point = JSON.parse(JSON.stringify(frame.points[pointIndex]));

        return {
            name: `Delete Point: ${point.name}`,
            animationIndex: $self.cache.curAnimationId,
            frameIndex: $self.cache.curFrameId,
            pointIndex: pointIndex,
            pointData: point,

            execute() {
                const frame = $self.animatorData.animations[this.animationIndex].frames[this.frameIndex];
                frame.points.splice(this.pointIndex, 1);
                $self.loadCurrentFramePoints();
            },

            undo() {
                const frame = $self.animatorData.animations[this.animationIndex].frames[this.frameIndex];
                frame.points.splice(this.pointIndex, 0, this.pointData);
                $self.loadCurrentFramePoints();
            }
        };
    },

    /**
     * Command: Change Frame Point Property (name, x, y)
     */
    createPointPropertyChangeCommand(pointIndex, propertyName, oldValue, newValue) {
        const $self = this;
        const frame = this.animatorData.animations[this.cache.curAnimationId].frames[this.cache.curFrameId];
        const pointName = frame.points[pointIndex].name; // Store original point name as identifier

        return {
            name: `Change Point ${propertyName}`,
            animationIndex: $self.cache.curAnimationId,
            frameIndex: $self.cache.curFrameId,
            pointIndex: pointIndex,
            pointName: pointName, // Use name as unique identifier
            propertyName: propertyName,
            oldValue: oldValue,
            newValue: newValue,

            execute() {
                const frame = $self.animatorData.animations[this.animationIndex].frames[this.frameIndex];

                // Find point by name (or index if name changed)
                let currentPointIndex = this.pointIndex;
                if (this.propertyName !== 'name') {
                    currentPointIndex = frame.points.findIndex(p => p.name === this.pointName);
                    if (currentPointIndex === -1) {
                        console.error('[Animator] Point not found:', this.pointName);
                        throw new Error(`Point "${this.pointName}" not found in frame`);
                    }
                }

                // For name changes, use the old name to find the point
                if (this.propertyName === 'name') {
                    currentPointIndex = frame.points.findIndex(p => p.name === this.oldValue);
                    if (currentPointIndex === -1) {
                        console.error('[Animator] Point with old name not found:', this.oldValue);
                        throw new Error(`Point "${this.oldValue}" not found in frame`);
                    }
                }

                frame.points[currentPointIndex][this.propertyName] = this.newValue;

                // Update UI without full reload
                if ($self.cache.curAnimationId === this.animationIndex && $self.cache.curFrameId === this.frameIndex) {
                    if (this.propertyName === 'name') {
                        // Update visual label
                        const visualPoint = $(`.aibFramePoint[__ajs_frame_point_id="${currentPointIndex}"]`)[0];
                        if (visualPoint) {
                            const label = visualPoint.querySelector('.aibPointLabel');
                            if (label) label.textContent = this.newValue;
                        }
                        // Update input
                        const input = $(`.afpbPointNameInput[__ajs_frame_point_id="${currentPointIndex}"]`)[0];
                        if (input) input.value = this.newValue;
                    } else if (this.propertyName === 'x' || this.propertyName === 'y') {
                        const currentZoom = $self.calculateZoom($("#animatorZoom")[0].value);
                        const visualPoint = $(`.aibFramePoint[__ajs_frame_point_id="${currentPointIndex}"]`)[0];
                        if (visualPoint) {
                            if (this.propertyName === 'x') {
                                visualPoint.style.left = (this.newValue * currentZoom) + "px";
                                const input = $(`.afpbPointX[__ajs_frame_point_id="${currentPointIndex}"]`)[0];
                                if (input) input.value = Math.round(this.newValue);
                            } else {
                                visualPoint.style.top = (this.newValue * currentZoom) + "px";
                                const input = $(`.afpbPointY[__ajs_frame_point_id="${currentPointIndex}"]`)[0];
                                if (input) input.value = Math.round(this.newValue);
                            }
                        }
                    }
                }
            },

            undo() {
                const frame = $self.animatorData.animations[this.animationIndex].frames[this.frameIndex];

                // Find point by name
                let currentPointIndex = this.pointIndex;
                if (this.propertyName === 'name') {
                    // For name changes, find by the new name (since execute already changed it)
                    currentPointIndex = frame.points.findIndex(p => p.name === this.newValue);
                    if (currentPointIndex === -1) {
                        console.error('[Animator] Point with new name not found:', this.newValue);
                        throw new Error(`Point "${this.newValue}" not found in frame`);
                    }
                } else {
                    // For x/y changes, find by original name
                    currentPointIndex = frame.points.findIndex(p => p.name === this.pointName);
                    if (currentPointIndex === -1) {
                        console.error('[Animator] Point not found:', this.pointName);
                        throw new Error(`Point "${this.pointName}" not found in frame`);
                    }
                }

                frame.points[currentPointIndex][this.propertyName] = this.oldValue;

                // Update UI without full reload
                if ($self.cache.curAnimationId === this.animationIndex && $self.cache.curFrameId === this.frameIndex) {
                    if (this.propertyName === 'name') {
                        // Update visual label
                        const visualPoint = $(`.aibFramePoint[__ajs_frame_point_id="${currentPointIndex}"]`)[0];
                        if (visualPoint) {
                            const label = visualPoint.querySelector('.aibPointLabel');
                            if (label) label.textContent = this.oldValue;
                        }
                        // Update input
                        const input = $(`.afpbPointNameInput[__ajs_frame_point_id="${currentPointIndex}"]`)[0];
                        if (input) input.value = this.oldValue;
                    } else if (this.propertyName === 'x' || this.propertyName === 'y') {
                        const currentZoom = $self.calculateZoom($("#animatorZoom")[0].value);
                        const visualPoint = $(`.aibFramePoint[__ajs_frame_point_id="${currentPointIndex}"]`)[0];
                        if (visualPoint) {
                            if (this.propertyName === 'x') {
                                visualPoint.style.left = (this.oldValue * currentZoom) + "px";
                                const input = $(`.afpbPointX[__ajs_frame_point_id="${currentPointIndex}"]`)[0];
                                if (input) input.value = Math.round(this.oldValue);
                            } else {
                                visualPoint.style.top = (this.oldValue * currentZoom) + "px";
                                const input = $(`.afpbPointY[__ajs_frame_point_id="${currentPointIndex}"]`)[0];
                                if (input) input.value = Math.round(this.oldValue);
                            }
                        }
                    }
                }
            }
        };
    },

    /**
     * Command: Add Animation Event
     */
    createAddEventCommand() {
        const $self = this;

        return {
            name: 'Add Event',
            animationIndex: $self.cache.curAnimationId,
            eventData: {
                frame: $self.cache.curFrameId >= 0 ? $self.cache.curFrameId : 0,
                name: 'onEvent',
                params: ''
            },

            execute() {
                const animation = $self.animatorData.animations[this.animationIndex];
                if (!animation.events) animation.events = [];
                animation.events.push(this.eventData);
                $self.loadAnimationEvents();
            },

            undo() {
                const animation = $self.animatorData.animations[this.animationIndex];
                animation.events.pop();
                $self.loadAnimationEvents();
            }
        };
    },

    /**
     * Command: Delete Animation Event
     */
    createDeleteEventCommand(eventIndex) {
        const $self = this;
        const animation = this.animatorData.animations[this.cache.curAnimationId];
        const event = JSON.parse(JSON.stringify(animation.events[eventIndex]));

        return {
            name: `Delete Event: ${event.name}`,
            animationIndex: $self.cache.curAnimationId,
            eventIndex: eventIndex,
            eventData: event,

            execute() {
                const animation = $self.animatorData.animations[this.animationIndex];
                if (!animation.events || this.eventIndex >= animation.events.length) {
                    console.error('[Animator] Event index out of bounds:', this.eventIndex);
                    throw new Error(`Event ${this.eventIndex} not found`);
                }
                animation.events.splice(this.eventIndex, 1);
                $self.loadAnimationEvents();
            },

            undo() {
                const animation = $self.animatorData.animations[this.animationIndex];
                if (!animation.events) animation.events = [];
                animation.events.splice(this.eventIndex, 0, this.eventData);
                $self.loadAnimationEvents();
            }
        };
    },

    /**
     * Command: Change Animation Property (frameRate, loop, startLoopFrame)
     */
    createAnimationPropertyChangeCommand(animationIndex, propertyName, oldValue, newValue) {
        const $self = this;

        return {
            name: `Change Animation ${propertyName}`,
            animationIndex: animationIndex,
            propertyName: propertyName,
            oldValue: oldValue,
            newValue: newValue,

            execute() {
                if (this.animationIndex >= $self.animatorData.animations.length) {
                    console.error('[Animator] Animation index out of bounds:', this.animationIndex);
                    throw new Error(`Animation ${this.animationIndex} not found`);
                }
                const animation = $self.animatorData.animations[this.animationIndex];
                animation[this.propertyName] = this.newValue;

                // Update UI
                if (this.propertyName === 'frameRate') {
                    $("#afaFrameRate").val(this.newValue);
                    // Reload timeline when frameRate changes (affects timeline display)
                    if ($self.cache.curAnimationId === this.animationIndex) {
                        $self.loadTimeline();
                    }
                } else if (this.propertyName === 'loop') {
                    $("#afaLoop").prop('checked', this.newValue);
                } else if (this.propertyName === 'startLoopFrame') {
                    $("#afaStartLoopFrame").val(this.newValue);
                } else if (this.propertyName === 'name') {
                    // Reload animations list to show new name
                    const currentAnimId = $self.cache.curAnimationId;
                    $self.cache.curAnimationId = -2; // Force reload
                    $self.loadAnimations(this.animationIndex);
                }
            },

            undo() {
                if (this.animationIndex >= $self.animatorData.animations.length) {
                    console.error('[Animator] Animation index out of bounds:', this.animationIndex);
                    throw new Error(`Animation ${this.animationIndex} not found`);
                }
                const animation = $self.animatorData.animations[this.animationIndex];
                animation[this.propertyName] = this.oldValue;

                // Update UI
                if (this.propertyName === 'frameRate') {
                    $("#afaFrameRate").val(this.oldValue);
                    // Reload timeline when frameRate changes (affects timeline display)
                    if ($self.cache.curAnimationId === this.animationIndex) {
                        $self.loadTimeline();
                    }
                } else if (this.propertyName === 'loop') {
                    $("#afaLoop").prop('checked', this.oldValue);
                } else if (this.propertyName === 'startLoopFrame') {
                    $("#afaStartLoopFrame").val(this.oldValue);
                } else if (this.propertyName === 'name') {
                    // Reload animations list to show old name
                    const currentAnimId = $self.cache.curAnimationId;
                    $self.cache.curAnimationId = -2; // Force reload
                    $self.loadAnimations(this.animationIndex);
                }
            }
        };
    },

    /**
     * Command: Update Property (generic for any property change)
     */
    createUpdatePropertyCommand(name, getter, setter, newValue) {
        const oldValue = getter();

        return {
            name: name,
            oldValue: JSON.parse(JSON.stringify(oldValue)),
            newValue: JSON.parse(JSON.stringify(newValue)),
            setter: setter,

            execute() {
                this.setter(this.newValue);
            },

            undo() {
                this.setter(this.oldValue);
            }
        };
    }
};