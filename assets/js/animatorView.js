$(document).ready(function () {
    setTimeout(function () {
        $('.subWinCloser').click(function () {
            const target = this.getAttribute('target');

            // Special handling for animator editor
            if (target === 'animatorEditorBack') {
                // Call closeAnimator which checks for unsaved changes
                animator.closeAnimator();
            } else {
                // Default behavior for other windows
                $("#" + target).css("display", "none");
            }
        });
        //
        $("#animatorZoom")[0].oninput = function () {
            animator.applyImageZoom(this.value);
        };

        // Save all button handler
        $("#animatorFramesActionsBody button:contains('Save all')").click(function () {
            animator.saveAnimator();
        });

        // Cancel all button handler
        $("#animatorFramesActionsBody button:contains('Close')").click(function () {
            // Call closeAnimator which checks for unsaved changes
            animator.closeAnimator();
        });

        // Play animation button handler (placeholder for now)
        $("#animatorFramesActionsBody button:contains('Play animation')").click(function () {
            animator.playAnimationPreview();
        });

        // Frame rate change handler with undo/redo
        let frameRateOriginalValue = null;
        $("#afaFrameRate").on('focus', function () {
            if (animator.cache.curAnimationId >= 0 && animator.animatorData.animations[animator.cache.curAnimationId]) {
                frameRateOriginalValue = animator.animatorData.animations[animator.cache.curAnimationId].frameRate;
            }
        }).on('input', function () {
            if (animator.cache.curAnimationId >= 0 && animator.animatorData.animations[animator.cache.curAnimationId]) {
                animator.animatorData.animations[animator.cache.curAnimationId].frameRate = parseInt(this.value) || 30;
            }
        }).on('blur', function () {
            if (animator.cache.curAnimationId >= 0 && animator.animatorData.animations[animator.cache.curAnimationId]) {
                const newValue = parseInt(this.value) || 30;
                if (frameRateOriginalValue !== null && frameRateOriginalValue !== newValue) {
                    const command = animator.createAnimationPropertyChangeCommand(
                        animator.cache.curAnimationId,
                        'frameRate',
                        frameRateOriginalValue,
                        newValue
                    );
                    animator.executeCommand(command);
                }
                frameRateOriginalValue = null;
            }
        });

        // Loop checkbox handler with undo/redo
        $("#afaLoop").on('change', function () {
            if (animator.cache.curAnimationId >= 0 && animator.animatorData.animations[animator.cache.curAnimationId]) {
                const oldValue = animator.animatorData.animations[animator.cache.curAnimationId].loop;
                const newValue = this.checked;

                // Don't set value here - let executeCommand do it via execute()
                const command = animator.createAnimationPropertyChangeCommand(
                    animator.cache.curAnimationId,
                    'loop',
                    oldValue,
                    newValue
                );
                animator.executeCommand(command);
            }
        });

        // Loop start frame handler with undo/redo
        let startLoopFrameOriginalValue = null;
        $("#afaStartLoopFrame").on('focus', function () {
            if (animator.cache.curAnimationId >= 0 && animator.animatorData.animations[animator.cache.curAnimationId]) {
                startLoopFrameOriginalValue = animator.animatorData.animations[animator.cache.curAnimationId].startLoopFrame;
            }
        }).on('input', function () {
            if (animator.cache.curAnimationId >= 0 && animator.animatorData.animations[animator.cache.curAnimationId]) {
                animator.animatorData.animations[animator.cache.curAnimationId].startLoopFrame = parseInt(this.value) || 0;
            }
        }).on('blur', function () {
            if (animator.cache.curAnimationId >= 0 && animator.animatorData.animations[animator.cache.curAnimationId]) {
                const newValue = parseInt(this.value) || 0;
                if (startLoopFrameOriginalValue !== null && startLoopFrameOriginalValue !== newValue) {
                    const command = animator.createAnimationPropertyChangeCommand(
                        animator.cache.curAnimationId,
                        'startLoopFrame',
                        startLoopFrameOriginalValue,
                        newValue
                    );
                    animator.executeCommand(command);
                }
                startLoopFrameOriginalValue = null;
            }
        });

        // Add point button handler
        $("#afpbPointAdd").click(function () {
            animator.addFramePoint();
        });


        // Timeline controls
        $("#timelinePlayBtn").click(function () {
            animator.playAnimationPreview();
        });

        $("#timelineFirstFrameBtn").click(function () {
            animator.jumpToFirstFrame();
        });

        $("#timelineLastFrameBtn").click(function () {
            animator.jumpToLastFrame();
        });

        // Onion skinning controls
        $("#onionSkinningEnabled").change(function () {
            animator.updateOnionSkinning();
        });

        $("#onionSkinningFrames").on('input change', function () {
            animator.updateOnionSkinning();
        });

        // Frame blending controls
        $("#frameBlendingEnabled").change(function () {
            animator.updateFrameBlending();
        });

        $("#frameBlendingAmount").on('input change', function () {
            animator.updateFrameBlending();
        });

        // Animation events
        $("#addAnimationEventBtn").click(function () {
            animator.addAnimationEvent();
        });

        // Undo/Redo buttons
        $("#undoBtn").click(function () {
            if ($(this).attr('disabled') !== 'true') {
                animator.undo();
            }
        });

        $("#redoBtn").click(function () {
            if ($(this).attr('disabled') !== 'true') {
                animator.redo();
            }
        });

        // Keyboard shortcuts for undo/redo
        $(document).on('keydown', function (e) {
            // Only handle shortcuts when animator is visible
            if ($('#animatorEditorBack').css('display') === 'none') return;

            // Ctrl+Z for undo
            if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                animator.undo();
            }

            // Ctrl+Y or Ctrl+Shift+Z for redo
            if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
                e.preventDefault();
                animator.redo();
            }

            // F11 for maximize toggle
            if (e.key === 'F11') {
                e.preventDefault();
                toggleAnimatorMaximize();
            }
        });

        // Maximize button handler
        $("#animatorMaximizeBtn").click(function () {
            toggleAnimatorMaximize();
        });

        // Toggle maximize function
        function toggleAnimatorMaximize() {
            const $editor = $("#animatorEditor");
            const $btn = $("#animatorMaximizeBtn");
            const isMaximized = $editor.attr('maximized') === 'true';

            if (isMaximized) {
                // Restore to normal view
                $editor.attr('maximized', 'false');
                $btn.removeClass('ri-fullscreen-exit-line').addClass('ri-fullscreen-line');
                $btn.attr('title', 'Maximize (F11)');
            } else {
                // Maximize
                $editor.attr('maximized', 'true');
                $btn.removeClass('ri-fullscreen-line').addClass('ri-fullscreen-exit-line');
                $btn.attr('title', 'Exit Maximize (F11)');
            }
        }

        // ==============================================
        // TWEEN GENERATOR HANDLERS
        // ==============================================

        // Generate Tweens button handler
        $("#generateTweensBtn").click(function () {
            if (animator.cache.curAnimationId < 0) {
                if (typeof notifications !== 'undefined') {
                    notifications.warning('Please select an animation first');
                } else {
                    alert('Please select an animation first');
                }
                return;
            }

            const animation = animator.animatorData.animations[animator.cache.curAnimationId];
            if (!animation.frames || animation.frames.length < 2) {
                if (typeof notifications !== 'undefined') {
                    notifications.warning('Need at least 2 frames to generate tweens');
                } else {
                    alert('Need at least 2 frames to generate tweens');
                }
                return;
            }

            // Populate frame dropdowns
            const $fromFrame = $("#tweenFromFrame");
            const $toFrame = $("#tweenToFrame");
            $fromFrame.empty();
            $toFrame.empty();

            animation.frames.forEach((frame, index) => {
                const frameName = `Frame ${index + 1}`;
                $fromFrame.append(`<option value="${index}">${frameName}</option>`);
                $toFrame.append(`<option value="${index}">${frameName}</option>`);
            });

            // Set default selection
            if (animator.cache.curFrameId >= 0 && animator.cache.curFrameId < animation.frames.length - 1) {
                $fromFrame.val(animator.cache.curFrameId);
                $toFrame.val(animator.cache.curFrameId + 1);
            } else {
                $fromFrame.val(0);
                $toFrame.val(1);
            }

            // Show modal
            $("#tweenGeneratorModal").css("display", "flex");
        });

        // Modal close handlers
        $("#tweenGeneratorModal .modal-close, #tweenGeneratorModal .modal-cancel").click(function () {
            $("#tweenGeneratorModal").css("display", "none");
        });

        $("#tweenGeneratorModal .modal-overlay").click(function () {
            $("#tweenGeneratorModal").css("display", "none");
        });

        // Generate tweens confirm handler
        $("#generateTweensConfirm").click(function () {
            const fromIndex = parseInt($("#tweenFromFrame").val());
            const toIndex = parseInt($("#tweenToFrame").val());
            const tweenCount = parseInt($("#tweenCount").val());
            const easingType = $("#tweenEasingType").val();
            const interpolatePoints = $("#tweenInterpolatePoints").is(':checked');

            // Validation
            if (isNaN(fromIndex) || isNaN(toIndex) || isNaN(tweenCount)) {
                if (typeof notifications !== 'undefined') {
                    notifications.error('Invalid input values');
                } else {
                    alert('Invalid input values');
                }
                return;
            }

            if (fromIndex === toIndex) {
                if (typeof notifications !== 'undefined') {
                    notifications.warning('From and To frames must be different');
                } else {
                    alert('From and To frames must be different');
                }
                return;
            }

            if (tweenCount < 1 || tweenCount > 100) {
                if (typeof notifications !== 'undefined') {
                    notifications.warning('Tween count must be between 1 and 100');
                } else {
                    alert('Tween count must be between 1 and 100');
                }
                return;
            }

            // Generate tween frames
            const tweenFrames = animator.generateTweenFrames(
                fromIndex,
                toIndex,
                tweenCount,
                easingType,
                {
                    points: interpolatePoints
                }
            );

            if (tweenFrames && tweenFrames.length > 0) {
                // Insert after the from frame
                animator.insertTweenFrames(fromIndex, tweenFrames);

                // Close modal
                $("#tweenGeneratorModal").css("display", "none");

            }
        });

        // ============================================
        // Custom Number Input Spinner Handlers
        // ============================================

        // Handler for Animation Actions number inputs (afaFrameRate, afaStartLoopFrame)
        let afabIntervals = {};
        let afabTimeouts = {};

        $(document).on('mousedown', '.afabNumberBtn', function (event) {
            event.preventDefault();
            const $btn = $(this);
            const inputId = $btn.data('input-id');
            const $input = $('#' + inputId);
            const isIncrease = $btn.hasClass('afabNumberIncrease');
            const isDecrease = $btn.hasClass('afabNumberDecrease');

            if (!$input.length) return;

            const min = parseInt($input.data('min')) || -Infinity;
            const max = parseInt($input.data('max')) || Infinity;

            // Determine increment based on modifiers
            let increment = 1;
            if (event.shiftKey) increment = 10;
            if (event.ctrlKey) increment = 0.1;

            const adjustValue = () => {
                let currentValue = parseFloat($input.val()) || 0;
                if (isIncrease) {
                    currentValue = Math.min(max, currentValue + increment);
                } else if (isDecrease) {
                    currentValue = Math.max(min, currentValue - increment);
                }

                // Round to avoid floating point issues
                currentValue = Math.round(currentValue * 10) / 10;

                $input.val(currentValue);
                $input.trigger('input');
            };

            // Immediate change
            adjustValue();

            // Progressive acceleration
            let currentDelay = 300;
            const minDelay = 50;

            const startRepeating = () => {
                adjustValue();
                currentDelay = Math.max(minDelay, currentDelay - 20);
                afabTimeouts[inputId] = setTimeout(startRepeating, currentDelay);
            };

            afabIntervals[inputId] = setTimeout(startRepeating, 500);
        });

        $(document).on('mouseup mouseleave', '.afabNumberBtn', function () {
            const inputId = $(this).data('input-id');
            if (afabIntervals[inputId]) {
                clearTimeout(afabIntervals[inputId]);
                delete afabIntervals[inputId];
            }
            if (afabTimeouts[inputId]) {
                clearTimeout(afabTimeouts[inputId]);
                delete afabTimeouts[inputId];
            }

            // Trigger blur to save value with undo/redo
            $('#' + inputId).trigger('blur');
        });

        // Handler for Timeline number inputs (onionSkinningFrames)
        let timelineIntervals = {};
        let timelineTimeouts = {};

        $(document).on('mousedown', '.timelineNumberBtn', function (event) {
            event.preventDefault();
            const $btn = $(this);
            const inputId = $btn.data('input-id');
            const $input = $('#' + inputId);
            const isIncrease = $btn.hasClass('timelineNumberIncrease');
            const isDecrease = $btn.hasClass('timelineNumberDecrease');

            if (!$input.length) return;

            const min = parseInt($input.data('min')) || 1;
            const max = parseInt($input.data('max')) || 10;

            let increment = 1;
            if (event.shiftKey) increment = 5;

            const adjustValue = () => {
                let currentValue = parseInt($input.val()) || min;
                if (isIncrease) {
                    currentValue = Math.min(max, currentValue + increment);
                } else if (isDecrease) {
                    currentValue = Math.max(min, currentValue - increment);
                }

                $input.val(currentValue);
                $input.trigger('input');
            };

            adjustValue();

            let currentDelay = 300;
            const minDelay = 50;

            const startRepeating = () => {
                adjustValue();
                currentDelay = Math.max(minDelay, currentDelay - 20);
                timelineTimeouts[inputId] = setTimeout(startRepeating, currentDelay);
            };

            timelineIntervals[inputId] = setTimeout(startRepeating, 500);
        });

        $(document).on('mouseup mouseleave', '.timelineNumberBtn', function () {
            const inputId = $(this).data('input-id');
            if (timelineIntervals[inputId]) {
                clearTimeout(timelineIntervals[inputId]);
                delete timelineIntervals[inputId];
            }
            if (timelineTimeouts[inputId]) {
                clearTimeout(timelineTimeouts[inputId]);
                delete timelineTimeouts[inputId];
            }
        });

        // Handler for Modal number inputs (tweenCount)
        let modalIntervals = {};
        let modalTimeouts = {};

        $(document).on('mousedown', '.modalNumberBtn', function (event) {
            event.preventDefault();
            const $btn = $(this);
            const inputId = $btn.data('input-id');
            const $input = $('#' + inputId);
            const isIncrease = $btn.hasClass('modalNumberIncrease');
            const isDecrease = $btn.hasClass('modalNumberDecrease');

            if (!$input.length) return;

            const min = parseInt($input.data('min')) || 1;
            const max = parseInt($input.data('max')) || 100;

            let increment = 1;
            if (event.shiftKey) increment = 10;

            const adjustValue = () => {
                let currentValue = parseInt($input.val()) || min;
                if (isIncrease) {
                    currentValue = Math.min(max, currentValue + increment);
                } else if (isDecrease) {
                    currentValue = Math.max(min, currentValue - increment);
                }

                $input.val(currentValue);
            };

            adjustValue();

            let currentDelay = 300;
            const minDelay = 50;

            const startRepeating = () => {
                adjustValue();
                currentDelay = Math.max(minDelay, currentDelay - 20);
                modalTimeouts[inputId] = setTimeout(startRepeating, currentDelay);
            };

            modalIntervals[inputId] = setTimeout(startRepeating, 500);
        });

        $(document).on('mouseup mouseleave', '.modalNumberBtn', function () {
            const inputId = $(this).data('input-id');
            if (modalIntervals[inputId]) {
                clearTimeout(modalIntervals[inputId]);
                delete modalIntervals[inputId];
            }
            if (modalTimeouts[inputId]) {
                clearTimeout(modalTimeouts[inputId]);
                delete modalTimeouts[inputId];
            }
        });

        // ============================================
        // Keyboard Shortcuts for Multi-Selection
        // ============================================

        // Global keyboard handler for animator (attach to document when animator is open)
        let animatorKeyHandler = null;

        // Function to check if animator is currently open and focused
        function isAnimatorActive() {
            return $('#animatorEditor').css('display') !== 'none';
        }

        // Remove old handler if exists
        if (animatorKeyHandler) {
            $(document).off('keydown', animatorKeyHandler);
        }

        // Create new handler
        animatorKeyHandler = function(e) {
            // Only handle when animator is open
            if (!isAnimatorActive()) return;

            // Don't handle if user is typing in an input field
            const target = e.target;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                return;
            }

            // Ctrl+A or Cmd+A - Select all frames
            if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
                e.preventDefault();
                if (animator.cache.curAnimationId >= 0) {
                    const animation = animator.animatorData.animations[animator.cache.curAnimationId];
                    animator.cache.selectedFrames = [];
                    animation.frames.forEach((_, index) => {
                        animator.cache.selectedFrames.push(index);
                    });

                    // Visual update
                    $('.afBodyItem').addClass('selected');

                    if (typeof notifications !== 'undefined') {
                        notifications.info(`${animator.cache.selectedFrames.length} frame(s) selected`);
                    }
                }
            }

            // Delete key - Delete selected frames
            else if (e.key === 'Delete' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
                e.preventDefault();
                if (animator.cache.selectedFrames.length > 0) {
                    if (animator.cache.selectedFrames.length === 1) {
                        animator.deleteFrame(animator.cache.curAnimationId, animator.cache.selectedFrames[0]);
                    } else {
                        animator.deleteMultipleFrames(animator.cache.curAnimationId, animator.cache.selectedFrames);
                    }
                }
            }

            // Ctrl+C or Cmd+C - Copy selected frames
            else if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !e.shiftKey) {
                // Only if frames area has focus (not inputs)
                if (animator.cache.selectedFrames.length > 0) {
                    e.preventDefault();
                    animator.copySelectedFrames();
                }
            }

            // Ctrl+V or Cmd+V - Paste frames
            else if ((e.ctrlKey || e.metaKey) && e.key === 'v' && !e.shiftKey) {
                // Only if frames area has focus (not inputs)
                if (animator.clipboard.frames && animator.clipboard.frames.length > 0) {
                    e.preventDefault();
                    animator.pasteFrames();
                }
            }

            // Ctrl+X or Cmd+X - Cut selected frames (copy + delete)
            else if ((e.ctrlKey || e.metaKey) && e.key === 'x' && !e.shiftKey) {
                if (animator.cache.selectedFrames.length > 0) {
                    e.preventDefault();
                    animator.copySelectedFrames();

                    // Delete after copying
                    setTimeout(() => {
                        if (animator.cache.selectedFrames.length === 1) {
                            animator._performDeleteFrame(animator.cache.curAnimationId, animator.cache.selectedFrames[0]);
                        } else {
                            animator._performDeleteMultipleFrames(animator.cache.curAnimationId, animator.cache.selectedFrames);
                        }
                    }, 100);
                }
            }
        };

        // Attach the handler
        $(document).on('keydown', animatorKeyHandler);

        // Initialize undo/redo button states
        animator.updateUndoRedoButtons();
    }, 4000);
});