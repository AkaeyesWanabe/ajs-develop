const $ = require('jquery');
const fs = nw.require('fs');
const globals = require('./assets/js/common/globals');
//
const sceneEditor = nw.require('./assets/js/objects/sceneEditor');
const properties = nw.require('./assets/js/objects/properties');
const animator = nw.require('./assets/js/objects/animator');
const objectCreator = nw.require('./assets/js/objects/objectCreator');
const notifications = nw.require('./assets/js/objects/notifications');
//
// Make modules globally accessible to ensure all parts use the same instance
if (typeof window !== 'undefined') {
    window.sceneEditor = sceneEditor;
    window.properties = properties;
    window.objectCreator = objectCreator;
}
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

    //preloader animation
    this.preload = setInterval(function () {
      let value = $("#preloaderLoadingBar div")[0].getAttribute("value") - (-1 / 7.5);
      $("#preloaderLoadingBar div")[0].setAttribute("value", value);
      //
      $("#preloaderLoadingBar div").css("width", value + "%");
    }, 1);

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
      sceneEditor.refreshEditor();
      animator.refreshEditor();
    });

    this.draggableWindow();
    this.setupKeyboardShortcuts();

    $(document).keydown(function (e) {
      //ctrl
      globals.keysIsPressed.ctrl = e.ctrlKey;
      //shift
      globals.keysIsPressed.shift = e.shiftKey;
      //alt
      globals.keysIsPressed.alt = e.altKey;

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
      globals.keysIsPressed.ctrl = e.ctrlKey;
      //shift
      globals.keysIsPressed.shift = e.shiftKey;
      //alt
      globals.keysIsPressed.alt = e.altKey;

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
    console.log('[KEYBOARD] Setting up keyboard shortcuts...');

    // Use window.addEventListener for maximum compatibility
    window.addEventListener('keydown', function(e) {
      console.log('[KEYBOARD] Key pressed:', e.key, 'Ctrl:', e.ctrlKey, 'Alt:', e.altKey, 'Shift:', e.shiftKey, 'Tab:', globals.app.tabName);

      // PRIORITY 1: Check if animator is visible/open (highest priority - overrides everything)
      const isAnimatorVisible = $('#animatorEditorBack').length > 0 && $('#animatorEditorBack').css('display') !== 'none';

      if (isAnimatorVisible) {
        console.log('[KEYBOARD] Animator is visible - routing to animator');
        const animator = nw.require('./assets/js/objects/animator');

        // Ctrl+Z - Undo in animator
        if (e.ctrlKey && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
          e.preventDefault();
          e.stopPropagation();
          console.log('[KEYBOARD] Ctrl+Z in animator - undo');
          if (animator && typeof animator.undo === 'function') {
            animator.undo();
          }
          return false;
        }

        // Ctrl+Y - Redo in animator
        if ((e.ctrlKey && !e.shiftKey && (e.key === 'y' || e.key === 'Y')) ||
            (e.ctrlKey && e.shiftKey && (e.key === 'z' || e.key === 'Z'))) {
          e.preventDefault();
          e.stopPropagation();
          console.log('[KEYBOARD] Ctrl+Y in animator - redo');
          if (animator && typeof animator.redo === 'function') {
            animator.redo();
          }
          return false;
        }

        // Ctrl+S - Save animator (CRITICAL FIX)
        if (e.ctrlKey && !e.shiftKey && (e.key === 's' || e.key === 'S')) {
          e.preventDefault();
          e.stopPropagation();
          console.log('[KEYBOARD] Ctrl+S in animator - save');
          if (animator && typeof animator.saveAnimator === 'function') {
            animator.saveAnimator();
          }
          return false;
        }

        // Block all other shortcuts when animator is visible
        // This prevents scene shortcuts from interfering
        console.log('[KEYBOARD] Animator is visible - blocking other shortcuts');
        return;
      }

      // Ctrl+Z - Undo (for scene editor and others)
      if (e.ctrlKey && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        e.stopPropagation();

        console.log('[KEYBOARD] Ctrl+Z detected - undo');
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

        console.log('[KEYBOARD] Ctrl+Y detected - redo');
        const commandManager = nw.require('./assets/js/objects/commandManager');
        if (commandManager) {
          commandManager.redo();
        }

        return false;
      }

      // Ctrl+C - Copy
      if (e.ctrlKey && !e.shiftKey && (e.key === 'c' || e.key === 'C')) {
        // Only handle in scene editor, let default behavior in script editor
        if (globals.app.tabName === 'sceneEditor') {
          e.preventDefault();
          e.stopPropagation();

          console.log('[KEYBOARD] Ctrl+C detected - copy');
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
        if (globals.app.tabName === 'sceneEditor') {
          e.preventDefault();
          e.stopPropagation();

          console.log('[KEYBOARD] Ctrl+X detected - cut');
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
        if (globals.app.tabName === 'sceneEditor') {
          e.preventDefault();
          e.stopPropagation();

          console.log('[KEYBOARD] Ctrl+V detected - paste');
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

        console.log('[SAVE] Ctrl+Shift+S detected - attempting to save project');
        console.log('[SAVE] globals.project.dir:', globals.project.dir);

        if (!globals.project.dir) {
          console.warn('[SAVE] No project loaded');
          if (notifications) {
            notifications.warning('No project is open');
          }
          return false;
        }

        console.log('[SAVE] Calling saveProject()...');
        const header = nw.require('./assets/js/objects/header');
        const result = header.saveProject();
        console.log('[SAVE] Save project result:', result);

        if (result && notifications) {
          notifications.success('Project saved successfully');
        } else if (notifications) {
          notifications.error('Failed to save project');
        }

        return false;
      }

      // Ctrl+S - Save (context-aware: scene or script)
      // Note: Animator save is handled above when animator is visible
      if (e.ctrlKey && !e.shiftKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        e.stopPropagation();

        console.log('[SAVE] Ctrl+S detected - current tab:', globals.app.tabName);

        // Save script if script editor is active
        if (globals.app.tabName === 'scriptEditor') {
          console.log('[SAVE] Saving script...');
          const scriptEditor = nw.require('./assets/js/objects/scriptEditor');
          if (scriptEditor && typeof scriptEditor.saveCurrentFile === 'function') {
            const result = scriptEditor.saveCurrentFile();
            console.log('[SAVE] Script save result:', result);
            // Notification is handled inside saveCurrentFile
          } else {
            console.error('[SAVE] Script editor not available or saveCurrentFile not a function');
            if (notifications) {
              notifications.error('Script editor not available');
            }
          }
          return false;
        }

        // Save scene (default or when scene editor is active)
        console.log('[SAVE] Saving scene...');
        console.log('[SAVE] sceneEditor exists:', !!sceneEditor);
        console.log('[SAVE] sceneData exists:', !!sceneEditor.sceneData);
        console.log('[SAVE] sceneData.objects:', sceneEditor.sceneData?.objects?.length);
        console.log('[SAVE] sceneFilePath:', sceneEditor.cache?.sceneFilePath);

        if (!sceneEditor.sceneData) {
          console.warn('[SAVE] No scene data to save');
          if (notifications) {
            notifications.warning('No scene is open');
          }
          return false;
        }

        if (!sceneEditor.cache.sceneFilePath) {
          console.warn('[SAVE] No scene file path');
          if (notifications) {
            notifications.warning('No scene file path');
          }
          return false;
        }

        console.log('[SAVE] Calling saveScene()...');
        const result = sceneEditor.saveScene();
        console.log('[SAVE] Save result:', result);

        if (result && notifications) {
          notifications.success('Scene saved successfully');
        } else if (notifications) {
          notifications.error('Failed to save scene');
        }

        return false;
      }

      // Ctrl+Shift+A - Open Align & Distribute toolbar
      if (e.ctrlKey && e.shiftKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        e.stopPropagation();

        console.log('[KEYBOARD] Ctrl+Shift+A detected - opening Align & Distribute toolbar');
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

        console.log('[KEYBOARD] Ctrl+G detected - grouping selected objects');
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

        console.log('[KEYBOARD] Ctrl+Shift+G detected - ungrouping selected objects');
        const groupManager = nw.require('./assets/js/objects/groupManager');
        if (groupManager) {
          groupManager.ungroupObjects();
        }

        return false;
      }

      // Delete key - Delete selected objects
      if (e.key === 'Delete' && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        const selectedElements = document.querySelectorAll('.clickable_selected');
        if (selectedElements.length > 0 && sceneEditor.sceneData) {
          e.preventDefault();

          // Get object data for each selected element
          const objectsToDelete = [];
          selectedElements.forEach(elem => {
            const oid = elem.getAttribute('__ajs_object_ID');
            const objectData = sceneEditor.sceneData.objects?.find(obj => obj.oid === oid);
            if (objectData) {
              objectsToDelete.push(objectData);
            }
          });

          if (objectsToDelete.length > 0) {
            // Confirm deletion
            const message = objectsToDelete.length === 1
              ? `Are you sure you want to delete "${objectsToDelete[0].properties.name}"?`
              : `Are you sure you want to delete ${objectsToDelete.length} objects?`;

            notifications.confirm('Delete Object' + (objectsToDelete.length > 1 ? 's' : ''), message, {
              confirmText: 'Delete',
              danger: true
            }).then(confirmed => {
              if (confirmed) {
                objectsToDelete.forEach(obj => {
                  sceneEditor.destroyObject(obj);
                });
                notifications.success(`Deleted ${objectsToDelete.length} object${objectsToDelete.length > 1 ? 's' : ''}`);
              }
            });
          }
        }
      }

      // Ctrl++ (numpad) - Zoom In
      if (e.ctrlKey && !e.shiftKey && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        e.stopPropagation();

        console.log('[KEYBOARD] Ctrl++ detected - zoom in');
        if (window.zoom) {
          window.zoom.zoomIn();
        }

        return false;
      }

      // Ctrl+- (numpad) - Zoom Out
      if (e.ctrlKey && !e.shiftKey && (e.key === '-' || e.key === '_')) {
        e.preventDefault();
        e.stopPropagation();

        console.log('[KEYBOARD] Ctrl+- detected - zoom out');
        if (window.zoom) {
          window.zoom.zoomOut();
        }

        return false;
      }

      // Ctrl+0 (numpad) - Reset Zoom
      if (e.ctrlKey && !e.shiftKey && e.key === '0') {
        e.preventDefault();
        e.stopPropagation();

        console.log('[KEYBOARD] Ctrl+0 detected - reset zoom');
        if (window.zoom) {
          window.zoom.resetZoom();
        }

        return false;
      }
    }, true); // Use capture phase to ensure it runs early

    console.log('[KEYBOARD] Keyboard shortcuts setup complete');
  },

  init() {
    //hide preloader and show app
    //resize to app size
    win.width = 1200;
    win.height = 700;
    win.setMinimumSize(1200, 700);
    win.setPosition("center");
    //
    //show the app
    clearInterval(this.preload);
    $("#preloader").fadeOut(300);
    $("#app").css("display", "flex");
    //
    // Initialize object creator modal
    objectCreator.init();
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
      globals.app.tabName = this.getAttribute("for");
      //
      let frames = document.querySelectorAll(".workFrame");
      frames.forEach(function (frame) {
        frame.classList.remove("active");
      });
      document.querySelector("#" + globals.app.tabName).classList.add("active");
      //
      let tabs = document.querySelectorAll("#editorTabs span");
      tabs.forEach(function (tab) {
        tab.classList.remove("active");
      });
      this.classList.add("active");
      //
      footer.refreshStatusDetails();
      //
      // Update status bar values based on active tab
      if (this.id == "sceneEditorTab") {
        sceneEditor.refreshEditor();
        // Update scene editor status
        const sceneBox = document.getElementById('scnSceneBox');
        const screenWidth = sceneBox ? parseInt(sceneBox.style.width) || 640 : 640;
        const screenHeight = sceneBox ? parseInt(sceneBox.style.height) || 480 : 480;
        footer.updateSceneEditorStatus({
          selectedCount: sceneEditor.selectedObjects ? sceneEditor.selectedObjects.length : 0,
          screenWidth: screenWidth,
          screenHeight: screenHeight,
          mouseX: 0,
          mouseY: 0
        });
      } else if (this.id == "scriptEditorTab") {
        // Update script editor status and force Monaco layout
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
    $("#sceneEditor").load("./views/sceneEditor.html");
    $("#scriptEditor").load("./views/scriptEditor.html", function() {
        // Initialize Monaco Editor after the view is loaded
        console.log('[APP] Script Editor view loaded, initializing Monaco...');
        const scriptEditor = nw.require('./assets/js/objects/scriptEditor');
        if (scriptEditor && typeof scriptEditor.init === 'function') {
            scriptEditor.init();
        } else {
            console.error('[APP] scriptEditor module not found or init not available');
        }
    });
    $("#runner").load("./views/player.html");
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
      themeLink.href = "./assets/themes/" + globals.user.theme + "/index.css";
      document.head.appendChild(themeLink);
      //load the user files icons theme
      fs.readFile("./assets/files-icons-themes/" + globals.user.fileIconTheme.theme + "/data.json", 'utf8', function (err, txt) {
        if (err) {
          alert(err);
          return;
        }
        //project file exist
        //
        globals.user.fileIconTheme.data = JSON.parse(txt);
        //get projectName
        $("#appTitle")[0].innerHTML = globals.app.name + " " + globals.app.versionName;
      });
    }, 100);
  },
}

//run project
project.run();