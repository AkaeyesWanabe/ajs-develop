const $ = require('jquery');
const fs = nw.require('fs');

// Load modules as global variables (avoid redeclaration errors on hot reload)
window.globals = window.globals || require('./assets/js/common/globals');
window.sceneEditor = window.sceneEditor || nw.require('./assets/js/objects/sceneEditor');
window.properties = window.properties || nw.require('./assets/js/objects/properties');
window.animator = window.animator || nw.require('./assets/js/objects/animator');
window.objectCreator = window.objectCreator || nw.require('./assets/js/objects/objectCreator');
window.notifications = window.notifications || nw.require('./assets/js/objects/notifications');
window.player = window.player || nw.require('./assets/js/objects/player');

// Verify sceneEditor is loaded correctly
//
//load window frame
const win = nw.Window.get();
const app = nw.App;
var tagTemp = document.querySelector("#tagTemp");
var contentTemp = "";

const project = {
  preload: null,

  run() {
    //load all views
    this.loadAppFrames();

    //preloader animation with percentage and loading text
    let progress = 0;
    const loadingTexts = [
      'Initializing workspace...',
      'Loading modules...',
      'Preparing scene editor...',
      'Loading extensions...',
      'Almost ready...'
    ];
    let currentTextIndex = 0;

    this.preload = setInterval(() => {
      progress += 0.5; // Increment by 0.5% each tick

      if (progress <= 100) {
        // Update progress bar
        $('.loading-bar-fill').css('width', progress + '%');
        $('.loading-bar-glow').css('width', progress + '%');

        // Update percentage display
        $('.loading-percentage').text(Math.floor(progress) + '%');

        // Update loading text at certain milestones
        const textProgress = Math.floor(progress / 20);
        if (textProgress !== currentTextIndex && textProgress < loadingTexts.length) {
          currentTextIndex = textProgress;
          $('.loading-text').fadeOut(200, function () {
            $(this).text(loadingTexts[currentTextIndex]).fadeIn(200);
          });
        }
      } else {
        clearInterval(this.preload);
      }
    }, 10); // Update every 10ms for smoother animation

    //on app ready
    $(document).ready(() => {
      setTimeout(() => {
        this.init();
        this.refreshApp();
      }, 5000);
    });

    //on window resize
    $(window).resize(() => {
      this.refreshApp();
      if (window.sceneEditor && typeof window.sceneEditor.refreshEditor === 'function') {
        window.sceneEditor.refreshEditor();
      }
      if (window.animator && typeof window.animator.refreshEditor === 'function') {
        window.animator.refreshEditor();
      }
    });

    // Save cache before closing application
    window.addEventListener('beforeunload', () => {
      const projectCache = nw.require('./assets/js/objects/projectCache');
      if (projectCache && projectCache.autoSave) {
        projectCache.autoSave();
      }
    });

    this.draggableWindow();
    this.setupKeyboardShortcuts();

    $(document).keydown(function (e) {
      //ctrl
      window.globals.keysIsPressed.ctrl = e.ctrlKey;
      //shift
      window.globals.keysIsPressed.shift = e.shiftKey;
      //alt
      window.globals.keysIsPressed.alt = e.altKey;

      // Add visual indicator when Alt is pressed
      if (e.altKey) {
        document.body.classList.add('alt-pressed');
        // Enable draggable on all scene objects for drag-to-layer
        const sceneObjects = document.querySelectorAll('.__ajs_scene_object');
        sceneObjects.forEach(obj => {
          obj.setAttribute('draggable', 'true');
        });
      }
    });

    $(document).keyup(function (e) {
      //ctrl
      window.globals.keysIsPressed.ctrl = e.ctrlKey;
      //shift
      window.globals.keysIsPressed.shift = e.shiftKey;
      //alt
      window.globals.keysIsPressed.alt = e.altKey;

      // Remove visual indicator when Alt is released
      if (!e.altKey) {
        document.body.classList.remove('alt-pressed');

        // Find any object currently being dragged and cancel the drag
        const draggingObject = document.querySelector('.__ajs_scene_object.dragging-object');
        if (draggingObject) {
          draggingObject.classList.remove('dragging-object');
        }

        // Disable draggable on all scene objects
        const sceneObjects = document.querySelectorAll('.__ajs_scene_object');
        sceneObjects.forEach(obj => {
          obj.setAttribute('draggable', 'false');
        });
      }
    });
  },

  draggableWindow() {
    var nwWin = nw.Window.get();

    var isDragging = false;
    var dragOrigin = { x: 0, y: 0 };

    let appMenu = $("#appMenu")[0];

    appMenu.onmousedown = (e) => {
      isDragging = true;
      dragOrigin.x = e.x;
      dragOrigin.y = e.y;
    }

    document.mouseleave = (_) => isDragging = false;
    document.onmouseup = (_) => isDragging = false;

    document.onmousemove = (e) => {
      if (isDragging) {
        nwWin.moveTo(e.screenX - dragOrigin.x, e.screenY - dragOrigin.y);
      }
    }
  },

  setupKeyboardShortcuts() {

    // Use window.addEventListener for maximum compatibility
    window.addEventListener('keydown', function (e) {

      // PRIORITY 1: Check if animator is visible/open (highest priority - overrides everything)
      const isAnimatorVisible = $('#animatorEditorBack').length > 0 && $('#animatorEditorBack').css('display') !== 'none';

      if (isAnimatorVisible) {
        const animatorModule = window.animator;

        // Ctrl+Z - Undo in animator
        if (e.ctrlKey && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
          e.preventDefault();
          e.stopPropagation();
          if (animatorModule && typeof animatorModule.undo === 'function') {
            animatorModule.undo();
          }
          return false;
        }

        // Ctrl+Y - Redo in animator
        if ((e.ctrlKey && !e.shiftKey && (e.key === 'y' || e.key === 'Y')) ||
          (e.ctrlKey && e.shiftKey && (e.key === 'z' || e.key === 'Z'))) {
          e.preventDefault();
          e.stopPropagation();
          if (animatorModule && typeof animatorModule.redo === 'function') {
            animatorModule.redo();
          }
          return false;
        }

        // Ctrl+S - Save animator (CRITICAL FIX)
        if (e.ctrlKey && !e.shiftKey && (e.key === 's' || e.key === 'S')) {
          e.preventDefault();
          e.stopPropagation();
          if (animatorModule && typeof animatorModule.saveAnimator === 'function') {
            animatorModule.saveAnimator();
          }
          return false;
        }

        // Block all other shortcuts when animator is visible
        // This prevents scene shortcuts from interfering
        return;
      }

      // Ctrl+Z - Undo (for scene editor and others)
      if (e.ctrlKey && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        e.stopPropagation();

        const commandManager = nw.require('./assets/js/objects/commandManager');
        if (commandManager) {
          commandManager.undo();
        }

        return false;
      }

      // Ctrl+Y - Redo (also Ctrl+Shift+Z) (for scene editor and others)
      if ((e.ctrlKey && !e.shiftKey && (e.key === 'y' || e.key === 'Y')) ||
        (e.ctrlKey && e.shiftKey && (e.key === 'z' || e.key === 'Z'))) {
        e.preventDefault();
        e.stopPropagation();

        const commandManager = nw.require('./assets/js/objects/commandManager');
        if (commandManager) {
          commandManager.redo();
        }

        return false;
      }

      // Ctrl+C - Copy
      if (e.ctrlKey && !e.shiftKey && (e.key === 'c' || e.key === 'C')) {
        // Only handle in scene editor, let default behavior in script editor
        if (window.globals.app.tabName === 'sceneEditor') {
          e.preventDefault();
          e.stopPropagation();

          const clipboard = nw.require('./assets/js/objects/clipboard');
          if (clipboard) {
            clipboard.copy();
          }

          return false;
        }
      }

      // Ctrl+X - Cut
      if (e.ctrlKey && !e.shiftKey && (e.key === 'x' || e.key === 'X')) {
        // Only handle in scene editor, let default behavior in script editor
        if (window.globals.app.tabName === 'sceneEditor') {
          e.preventDefault();
          e.stopPropagation();

          const clipboard = nw.require('./assets/js/objects/clipboard');
          if (clipboard) {
            clipboard.cut();
          }

          return false;
        }
      }

      // Ctrl+V - Paste
      if (e.ctrlKey && !e.shiftKey && (e.key === 'v' || e.key === 'V')) {
        // Only handle in scene editor, let default behavior in script editor
        if (window.globals.app.tabName === 'sceneEditor') {
          e.preventDefault();
          e.stopPropagation();

          const clipboard = nw.require('./assets/js/objects/clipboard');
          if (clipboard) {
            clipboard.paste();
          }

          return false;
        }
      }

      // Ctrl+Shift+S - Save project
      if (e.ctrlKey && e.shiftKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        e.stopPropagation();


        if (!window.globals.project.dir) {
          console.warn('[SAVE] No project loaded');
          if (window.notifications) {
            window.notifications.warning('No project is open');
          }
          return false;
        }

        const header = nw.require('./assets/js/objects/header');
        const result = header.saveProject();

        if (result && window.notifications) {
          window.notifications.success('Project saved successfully');
        } else if (window.notifications) {
          window.notifications.error('Failed to save project');
        }

        return false;
      }

      // Ctrl+S - Save (context-aware: scene or script)
      // Note: Animator save is handled above when animator is visible
      if (e.ctrlKey && !e.shiftKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        e.stopPropagation();


        // Save script if script editor is active
        if (window.globals.app.tabName === 'scriptEditor') {
          const scriptEditor = nw.require('./assets/js/objects/scriptEditor');
          if (scriptEditor && typeof scriptEditor.saveCurrentFile === 'function') {
            const result = scriptEditor.saveCurrentFile();
            // Notification is handled inside saveCurrentFile
          } else {
            console.error('[SAVE] Script editor not available or saveCurrentFile not a function');
            if (window.notifications) {
              window.notifications.error('Script editor not available');
            }
          }
          return false;
        }

        // Save scene (default or when scene editor is active)

        if (!window.sceneEditor.sceneData) {
          console.warn('[SAVE] No scene data to save');
          if (window.notifications) {
            window.notifications.warning('No scene is open');
          }
          return false;
        }

        if (!window.sceneEditor.cache.sceneFilePath) {
          console.warn('[SAVE] No scene file path');
          if (window.notifications) {
            window.notifications.warning('No scene file path');
          }
          return false;
        }

        const result = window.sceneEditor.saveScene();

        if (result && window.notifications) {
          window.notifications.success('Scene saved successfully');
        } else if (window.notifications) {
          window.notifications.error('Failed to save scene');
        }

        return false;
      }

      // Ctrl+Shift+A - Open Align & Distribute toolbar
      if (e.ctrlKey && e.shiftKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        e.stopPropagation();

        const alignTools = nw.require('./assets/js/objects/alignTools');
        if (alignTools) {
          alignTools.showToolbar();
        }

        return false;
      }

      // Ctrl+G - Group selected objects
      if (e.ctrlKey && !e.shiftKey && (e.key === 'g' || e.key === 'G')) {
        e.preventDefault();
        e.stopPropagation();

        const groupManager = nw.require('./assets/js/objects/groupManager');
        if (groupManager) {
          groupManager.groupObjects();
        }

        return false;
      }

      // Ctrl+Shift+G - Ungroup selected objects
      if (e.ctrlKey && e.shiftKey && (e.key === 'g' || e.key === 'G')) {
        e.preventDefault();
        e.stopPropagation();

        const groupManager = nw.require('./assets/js/objects/groupManager');
        if (groupManager) {
          groupManager.ungroupObjects();
        }

        return false;
      }

      // Ctrl+] - Bring to front
      if (e.ctrlKey && !e.shiftKey && e.key === ']') {
        e.preventDefault();
        e.stopPropagation();

        if (window.sceneEditor && window.sceneEditor.bringToFront) {
          window.sceneEditor.bringToFront();
        }

        return false;
      }

      // ] - Move forward
      if (!e.ctrlKey && !e.shiftKey && e.key === ']') {
        e.preventDefault();
        e.stopPropagation();

        if (window.sceneEditor && window.sceneEditor.moveForward) {
          window.sceneEditor.moveForward();
        }

        return false;
      }

      // [ - Move backward
      if (!e.ctrlKey && !e.shiftKey && e.key === '[') {
        e.preventDefault();
        e.stopPropagation();

        if (window.sceneEditor && window.sceneEditor.moveBackward) {
          window.sceneEditor.moveBackward();
        }

        return false;
      }

      // Ctrl+[ - Send to back
      if (e.ctrlKey && !e.shiftKey && e.key === '[') {
        e.preventDefault();
        e.stopPropagation();

        if (window.sceneEditor && window.sceneEditor.sendToBack) {
          window.sceneEditor.sendToBack();
        }

        return false;
      }

      // Delete key - Delete selected objects
      if (e.key === 'Delete' && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        const selectedElements = document.querySelectorAll('.clickable_selected');
        if (selectedElements.length > 0 && window.sceneEditor.sceneData) {
          e.preventDefault();

          // Get object data for each selected element
          const objectsToDelete = [];
          selectedElements.forEach(elem => {
            const oid = elem.getAttribute('__ajs_object_ID');
            const objectData = window.sceneEditor.sceneData.objects?.find(obj => obj.oid === oid);
            if (objectData) {
              objectsToDelete.push(objectData);
            }
          });

          if (objectsToDelete.length > 0) {
            // Confirm deletion
            const message = objectsToDelete.length === 1
              ? `Are you sure you want to delete "${objectsToDelete[0].properties.name}"?`
              : `Are you sure you want to delete ${objectsToDelete.length} objects?`;

            window.notifications.confirm('Delete Object' + (objectsToDelete.length > 1 ? 's' : ''), message, {
              confirmText: 'Delete',
              danger: true
            }).then(confirmed => {
              if (confirmed) {
                objectsToDelete.forEach(obj => {
                  window.sceneEditor.destroyObject(obj);
                });
                window.notifications.success(`Deleted ${objectsToDelete.length} object${objectsToDelete.length > 1 ? 's' : ''}`);
              }
            });
          }
        }
      }

      // Ctrl++ (numpad) - Zoom In
      if (e.ctrlKey && !e.shiftKey && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        e.stopPropagation();

        if (window.zoom) {
          window.zoom.zoomIn();
        }

        return false;
      }

      // Ctrl+- (numpad) - Zoom Out
      if (e.ctrlKey && !e.shiftKey && (e.key === '-' || e.key === '_')) {
        e.preventDefault();
        e.stopPropagation();

        if (window.zoom) {
          window.zoom.zoomOut();
        }

        return false;
      }

      // Ctrl+0 (numpad) - Reset Zoom
      if (e.ctrlKey && !e.shiftKey && e.key === '0') {
        e.preventDefault();
        e.stopPropagation();

        if (window.zoom) {
          window.zoom.resetZoom();
        }

        return false;
      }
    }, true); // Use capture phase to ensure it runs early

  },

  init() {
    //hide preloader and show app
    //resize to app size
    win.width = 1200;
    win.height = 700;
    win.setMinimumSize(1200, 700);
    win.setPosition("center");
    //
    //show the app with smooth transition
    clearInterval(this.preload);

    // Ensure loading bar reaches 100%
    $('.loading-bar-fill, .loading-bar-glow').css('width', '100%');
    $('.loading-percentage').text('100%');
    $('.loading-text').text('Ready!');
    //
    $("#preloader").addClass('fade-out');
    $("#app").css("display", "flex");
    //hide the preloader and show the app
    $("#preloader").remove();
    //
    // Initialize object creator modal
    window.objectCreator.init();
    //
    //for all workspaceItemCheck
    let objs = $(".workspaceSubMenu div[check]");
    for (let i = 0; i < objs.length; i++) {
      if (objs[i].getAttribute("check") == "true") {
        objs[i].children[1].style.display = "block";
      }
    }

    //click event to toggle checking state
    $(".workspaceMenuItem").mouseover(function () {
      this.children[1].style.left = 0 + "px";
      this.children[1].style.top = 24 + "px";
      //correct position X
      if (this.children[1].getBoundingClientRect().right >= innerWidth) {
        this.children[1].style.right = "0";
      }
      //correct position Y
      if (this.children[1].getBoundingClientRect().bottom >= innerHeight) {
        this.children[1].style.bottom = "0";
      }
    });

    //click event to toggle checking state
    $(".workspaceSubMenu div[check]").click(function () {
      if (this.getAttribute("check") == null) return;
      //
      let check = this.getAttribute("check") == "true" ? true : false;
      if (!check) {
        this.setAttribute("check", "true");
        //
        this.children[1].style.display = "block";
      } else {
        this.setAttribute("check", "false");
        this.children[1].style.display = "none";
      }
    });

    //Editor Tabs click event
    $("#editorTabs span").click(function () {
      window.globals.app.tabName = this.getAttribute("for");
      //
      let frames = document.querySelectorAll(".workFrame");
      frames.forEach(function (frame) {
        frame.classList.remove("active");
      });
      document.querySelector("#" + window.globals.app.tabName).classList.add("active");
      //
      let tabs = document.querySelectorAll("#editorTabs span");
      tabs.forEach(function (tab) {
        tab.classList.remove("active");
      });
      this.classList.add("active");
      //
      const footer = nw.require('./assets/js/objects/footer');
      footer.refreshStatusDetails();
      //
      // Update status bar values based on active tab
      if (this.id == "sceneEditorTab") {
        window.sceneEditor.refreshEditor();
        // Update scene editor status
        const sceneBox = document.getElementById('scnSceneBox');
        const screenWidth = sceneBox ? parseInt(sceneBox.style.width) || 640 : 640;
        const screenHeight = sceneBox ? parseInt(sceneBox.style.height) || 480 : 480;
        footer.updateSceneEditorStatus({
          selectedCount: window.sceneEditor.selectedObjects ? window.sceneEditor.selectedObjects.length : 0,
          screenWidth: screenWidth,
          screenHeight: screenHeight,
          mouseX: 0,
          mouseY: 0
        });
      } else if (this.id == "scriptEditorTab") {
        // Update script editor status and force Monaco layout
        const scriptEditor = nw.require('./assets/js/objects/scriptEditor');
        if (scriptEditor) {
          if (scriptEditor.editor) {
            // Force Monaco to recalculate its layout when tab becomes visible
            setTimeout(() => {
              scriptEditor.editor.layout();
            }, 50);
          }
          if (scriptEditor.updateStatusBar) {
            scriptEditor.updateStatusBar();
          }
        }
      }
    });
  },

  refreshApp() {
    let btv = document.querySelector("#bottomView");
    let appMain = document.querySelector("#appMain");
    appMain.style.height = appMain.parentElement.clientHeight - btv.clientHeight + "px";
    //
    //set projectFilesBox size
    let pfb = document.querySelector("#projectFilesBox");
    pfb.style.height = pfb.parentElement.clientHeight - 32 + "px";
    //
    let properties = document.querySelector("#properties");
    properties.style.height = appMain.clientHeight + "px";
  },

  loadAppFrames() {
    //load the different views
    /*************
     APP MENU BAR
    *************/
    $("#appMenu").load("./views/header.html");
    //
    /*************
     PROPERTIES BAR
    *************/
    $("#properties").load("./views/properties.html");
    //
    /*************
     SCENE HIERACHY
    *************/
    $("#sceneHierachy").load("./views/hierachy.html");
    //
    /*************
     EDITOR
    *************/
    $("#sceneEditorView").load("./views/sceneEditor.html");
    $("#scriptEditorView").load("./views/scriptEditor.html", function () {
      // Initialize Monaco Editor after the view is loaded
      const scriptEditor = nw.require('./assets/js/objects/scriptEditor');
      if (scriptEditor && typeof scriptEditor.init === 'function') {
        scriptEditor.init();
      } else {
        console.error('[APP] scriptEditor module not found or init not available');
      }
    });
    $("#playerView").load("./views/player.html", function () {
      // Trigger player initialization after HTML is loaded

      // Get loading elements
      const loadingOverlay = document.getElementById('playerLoadingOverlay');
      const loadingBarFill = document.getElementById('playerLoadingBarFill');
      const loadingStatus = document.getElementById('playerLoadingStatus');

      // Update progress bar
      const updateProgress = (percent, status) => {
        if (loadingBarFill) loadingBarFill.style.width = percent + '%';
        if (loadingStatus) loadingStatus.textContent = status;
      };

      // Step 1: Check canvas (20%)
      updateProgress(20, 'Checking canvas...');
      const canvas = document.getElementById('playerCanvas');
      if (!canvas) {
        console.error('[APP] Player canvas not found!');
        if (loadingStatus) loadingStatus.textContent = 'Error: Canvas not found';
        return;
      }

      // Step 2: Check player module (40%)
      updateProgress(40, 'Loading player module...');
      if (!window.player) {
        console.error('[APP] Player module not loaded!');
        if (loadingStatus) loadingStatus.textContent = 'Error: Player module not loaded';
        return;
      }

      try {
        // Step 3: Initialize player (60%)
        updateProgress(60, 'Initializing player...');

        if (window.player) {

          // Check if it's the correct module
        }

        // Try to reload player module if it's not correct
        if (!window.player || typeof window.player.init !== 'function') {
          const playerModule = nw.require('./assets/js/objects/player');

          // Assign it directly
          window.player = playerModule;
        }

        if (typeof window.player.init === 'function') {
          window.player.init();
        } else {
          console.error('[APP] window.player.init is STILL not a function!');
          console.error('[APP] Final window.player:', window.player);
          if (loadingStatus) loadingStatus.textContent = 'Error: player.init is not a function';
          return;
        }

        // Step 4: Initialize event handlers (80%)
        updateProgress(80, 'Setting up event handlers...');
        if (typeof window.initPlayerHandlers === 'function') {
          window.initPlayerHandlers();
        } else {
          console.warn('[APP] initPlayerHandlers not found - will be called when playerView.js loads');
        }

        // Step 5: Complete (100%)
        updateProgress(100, 'Player ready!');

        // Hide loading overlay after a short delay
        setTimeout(() => {
          if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
          }
        }, 500);

      } catch (err) {
        console.error('[APP] Failed to initialize player:', err);
        if (loadingStatus) loadingStatus.textContent = 'Error: ' + err.message;
      }
    });
    //
    /*************
     CONSOLE
    *************/
    $("#console").load("./views/console.html");
    //
    /*************
     PROJECT FILES BAR
    *************/
    $("#projectFiles").load("./views/projectFiles.html");
    /*************
     STATUS BAR
    *************/
    $("#statusBar").load("./views/footer.html");
    /*************
     THE ANIMATOR
    *************/
    $("#animatorEditorBack").load("./views/animator.html");

    setTimeout(() => {
      //load the user theme
      let themeLink = document.createElement("link");
      themeLink.rel = "stylesheet";
      themeLink.href = "./assets/themes/" + window.globals.user.theme + "/index.css";
      document.head.appendChild(themeLink);
      //load the user files icons theme
      fs.readFile("./assets/files-icons-themes/" + window.globals.user.fileIconTheme.theme + "/data.json", 'utf8', function (err, txt) {
        if (err) {
          alert(err);
          return;
        }
        //project file exist
        //
        window.globals.user.fileIconTheme.data = JSON.parse(txt);
        //get projectName
        $("#appTitle")[0].innerHTML = window.globals.app.name + " " + window.globals.app.versionName;
      });
    }, 100);
  },
}

//run project
project.run();