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
        //
        try {
            this.cache.animatorPath = path;
            //
            $("#animatorEditorFileName").text(filename);
            //
            this.animatorData = JSON.parse(data);
            //
            $("#animatorEditorBack").css("display", "flex");
            //
            this.refreshEditor();
            this.loadAnimator();
        }
        catch (err) {
            alert("This animator file is dammaged or corrupted !");
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
            index = this.animatorData.animations.length;
        }
        //add animation in the animator data
        // Insert the element before the specified index
        this.animatorData.animations.splice(index + 1, 0, {
            "name": "New Animation " + this.animatorData.animations.length,
            "frameRate": 30,
            "loop": false,
            "startLoopFrame": 0,
            "frames": []
        });
        //
        this.loadAnimations(index + 1);
        //
        setTimeout(function () {
            $(".animsBodyItem")[index + 1].scrollIntoView();
            //
            $(".animsBodyItem[__ajs_animation_id='" + (index + 1) + "'] div")[0].style.display = "none";
            //
            let sel = ".animsBodyInput[__ajs_animation_id='" + (index + 1) + "']";
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
                <i class="bi bi-trash-fill"></i>
            </div>`;
            animsBody.innerHTML = animsBody.innerHTML + elem.trim();
        });
        //
        this.cache.curFrameId = -2;
        this.loadCurrentAnimationFrames(0);
        //
        setTimeout(() => {
            let $self = this;
            //
            $(".animsBodyItem").click(function () {
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
            $(".animsBodyItem label[__ajs_animation_id]").dblclick(function () {
                this.parentElement.style.display = "none";
                //
                let sel = ".animsBodyInput[__ajs_animation_id='" + this.getAttribute("__ajs_animation_id") + "']";
                $(sel).attr("shown", true);
                $(sel)[0].focus();
            });
            //
            //validate on focus out
            $(".animsBodyInput").focusout(function () {
                this.setAttribute("shown", "false");
                //
                let animId = $self.cache.curAnimationId;
                let sel = ".animsBodyItem label[__ajs_animation_id='" + animId + "']";
                $(sel).text(this.value);
                $(sel)[0].parentElement.style.display = "block";
                $self.animatorData.animations[animId].name = this.value;
            });
            //validate on enter press
            $(".animsBodyInput").keyup(function () {
                if (event.key === 'Enter') {
                    this.setAttribute("shown", "false");
                    //
                    let animId = this.getAttribute("__ajs_animation_id") - 0;
                    let sel = ".animsBodyItem label[__ajs_animation_id='" + animId + "']";
                    $(sel).text(this.value);
                    $(sel)[0].parentElement.style.display = "block";
                    $self.animatorData.animations[animId].name = this.value;
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
                <i class="bi bi-trash-fill"></i>
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
            $('.afBodyItem')[id].scrollIntoView();
            //
            $('.afBodyItem').click(function () {
                if ($self.cache.curFrameId == this.getAttribute("__ajs_animation_frame_id") - 0) {
                    return;
                }
                //
                $(".afBodyItem").removeClass("selected");
                this.classList.add("selected");
                //
                $self.cache.curFrameId = this.getAttribute("__ajs_animation_frame_id") - 0;
                //
                $self.loadCurrentAnimationImage();
            });
        }, 100);
    },

    loadCurrentAnimationImage() {
        let aibImg = $('#aibImg')[0];
        let aibp = $('#aibPoints')[0];
        let aibc = $('#aibCollider')[0];
        let aibcc = $('#aibColliderCanvas')[0];
        //
        if (this.animatorData.animations[this.cache.curAnimationId].frames.length == 0) {
            aibImg.style.display = "none";
            aibp.style.display = "none";
            aibc.style.display = "none";
            aibcc.style.display = "none";
            return;
        }
        //
        aibImg.style.display = "block";
        aibp.style.display = "block";
        aibc.style.display = "block";
        aibcc.style.display = "block";
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
        this.loadCurrentFrameCollider();
    },

    loadCurrentFramePoints() {
        let afpbPoints = $('#afpbPoints')[0];
        while (afpbPoints.firstChild) {
            afpbPoints.removeChild(afpbPoints.firstChild);
        }
        //
        this.animatorData.animations[this.cache.curAnimationId].frames[this.cache.curFrameId].points.forEach((point, index) => {
            //
            let elem = `
            <span class="afpbPoint" ajs_frame_point_removable="`+ point.removable + `" __ajs_frame_point_id="` + index + `">
                <div class="afpbPointName">
                    <label>Point Name</label>
                    <input type="text" class="afpbPointNameInput" value="`+ point.name + `" __ajs_frame_point_id="` + index + `">
                    <i class="bi bi-trash-fill"></i>
                    <i class="bi bi-lock-fill"></i>
                </div>
                <div class="afpbPointPos">
                    <label>X</label>
                    <input type="number" class="afpbPointX" value="`+ point.x + `" __ajs_frame_point_id="` + index + `">
                    <label>Y</label>
                    <input type="number" class="afpbPointY" value="`+ point.y + `" __ajs_frame_point_id="` + index + `">
                </div>
            </span>`;
            //show the file
            afpbPoints.innerHTML = afpbPoints.innerHTML + elem.trim();
        });
    },

    loadCurrentFrameCollider() {
        let aibc = $('#aibCollider')[0];
        // Remove all children
        while (aibc.firstChild) {
            aibc.removeChild(aibc.firstChild);
        }
        //
        let colliderPoints = this.animatorData.animations[this.cache.curAnimationId].frames[this.cache.curFrameId].collider;
        let zoom = $("#animatorZoom")[0].value;
        this.drawCollider(colliderPoints, zoom);
        //
        colliderPoints.forEach((point, index) => {
            //init each point
            let elem = document.createElement("DIV");
            elem.className = "aibColliderPoint";
            aibc.appendChild(elem);
            //
            elem.style.left = point.x + "px";
            elem.style.top = point.y + "px";
            elem.setAttribute("selected", false);
            elem.setAttribute("__ajs_collider_point_id", index);
            //
            const draggableElement = elem;
            let offsetX, offsetY, isDragging = false;
            let $self = this;
            // Function to handle mouse down event
            function onMouseDown(event) {
                isDragging = true;
                offsetX = event.clientX - parseInt(draggableElement.style.left);
                offsetY = event.clientY - parseInt(draggableElement.style.top);
                draggableElement.classList.add('dragging');
            }
            // Function to handle mouse move event
            function onMouseMove(event) {
                if (!isDragging) return;
                //
                let x = event.clientX - offsetX;
                let y = event.clientY - offsetY;
                draggableElement.style.left = x + "px";
                draggableElement.style.top = y + "px";
                //calculate new Zoom value
                let zoom = $("#animatorZoom")[0].value;
                if (zoom > 100) {
                    zoom = ((zoom - 100) * 8) / 50;
                }
                else if (zoom == 100) {
                    zoom = 1;
                }
                else {
                    zoom = (zoom / 200);
                }
                //
                point.x = x / zoom;
                point.y = y / zoom;
                //
                $self.showCollider(zoom);
            }
            // Function to handle mouse up event
            function onMouseUp() {
                isDragging = false;
                draggableElement.classList.remove('dragging');
            }
            // Attach event listeners
            draggableElement.addEventListener('mousedown', onMouseDown);
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
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

    applyImageZoom(zoom) {
        let aibImg = $('#aibImg')[0];
        let aiBox = $('#animatorImageBox')[0];
        let aibcc = $('#aibColliderCanvas')[0];
        //calculate new Zoom value
        if (zoom > 100) {
            zoom = ((zoom - 100) * 8) / 50;
        }
        else if (zoom == 100) {
            zoom = 1;
        }
        else {
            zoom = (zoom / 200);
        }
        //
        aiBox.style.width = aibImg.naturalWidth * zoom + "px";
        aiBox.style.height = aibImg.naturalHeight * zoom + "px";
        //
        aibImg.style.width = aibImg.naturalWidth * zoom + "px";
        aibImg.style.height = aibImg.naturalHeight * zoom + "px";
        //aib collider canvas
        aibcc.width = aibImg.naturalWidth * zoom;
        aibcc.height = aibImg.naturalHeight * zoom;
        //
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
        //
        //apply zoom on collider points
        this.showCollider(zoom);
    },

    showCollider(zoom) {
        let collider = document.querySelectorAll(".aibColliderPoint");
        let colliderPoints = this.animatorData.animations[this.cache.curAnimationId].frames[this.cache.curFrameId].collider;
        collider.forEach((point, index) => {
            let x = colliderPoints[point.getAttribute("__ajs_collider_point_id") - 0].x;
            let y = colliderPoints[point.getAttribute("__ajs_collider_point_id") - 0].y;
            point.style.left = x * zoom + "px";
            point.style.top = y * zoom + "px";
        });
        //
        this.drawCollider(colliderPoints, zoom);
    },

    drawCollider(colliderPoints, zoom) {
        // Get the canvas element and its 2d drawing context
        let canvas = $('#aibColliderCanvas')[0];
        let ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // colors
        ctx.strokeStyle = "#f80";
        ctx.fillStyle = "#f802";
        // Function to draw the polygon
        function drawPolygon(points) {
            if (points.length < 3) {
                return; // Not enough points to draw a shape
            }
            //
            ctx.beginPath();
            ctx.moveTo(points[0].x * zoom, points[0].y * zoom);
            //
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x * zoom, points[i].y * zoom);
            }
            //
            ctx.closePath(); // Close the path to connect the last point to the first
            ctx.stroke(); // Stroke the path (outline)
            ctx.fill();
        }
        // Call the drawPolygon function with your array of points
        drawPolygon(colliderPoints);
    },

    loadImagePicker() {
        //reset content temp
        let aipBody = document.querySelector("#animatorImagePickerBody");
        while (aipBody.firstChild) {
            aipBody.removeChild(aipBody.firstChild);
        }
        //
        this.loadAssetsImages(globals.project.files);
        //
        setTimeout(() => {
            let $self = this;
            //click event for all file item
            $('.aipBodyItem').click(function () {
                $(".aipBodyItem").removeClass("selected");
                this.classList.add("selected");
                //
                $self.cache.imagePickerPath = this.getAttribute("path");
            });
            //
            $(".aipBodyItem img").dblclick(function () {
                // Get the original width and height
                let originalWidth = this.naturalWidth;
                let originalHeight = this.naturalHeight;
                //
                let frame = {
                    "path": this.getAttribute("assetsPath"),
                    "width": originalWidth,
                    "height": originalHeight,
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
                            "x": originalWidth / 2,
                            "y": originalHeight / 2
                        }
                    ],
                    "collider": [
                        {
                            "x": 0,
                            "y": 0
                        },
                        {
                            "x": originalWidth,
                            "y": 0
                        },
                        {
                            "x": originalWidth,
                            "y": originalHeight
                        },
                        {
                            "x": 0,
                            "y": originalHeight
                        }
                    ]
                };
                //
                $self.animatorData.animations[$self.cache.curAnimationId].frames.splice($self.cache.curFrameId + 1, 0, frame);
                //
                let fId = $self.cache.curFrameId;
                $self.cache.curFrameId = -2;
                //
                $self.loadCurrentAnimationFrames(fId + 1);
            });
        }, 100);
    },

    // ////////////
    // IMAGE PICKER
    // ////////////
    loadAssetsImages(files) {
        //parse all files and folders
        files.forEach((file) => {
            //if it's a folder
            if (file.type == "dir") {
                let dir = file;
                this.loadAssetsImages(dir.children);
                return;
            }
            //if it's a file
            this.createImageItem(file);
        });
    },

    createImageItem(file) {
        const label = file.name.toLowerCase();
        //
        let aipBody = document.querySelector("#animatorImagePickerBody");
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
        //show the file
        aipBody.innerHTML = aipBody.innerHTML + elem.trim();
    }
};