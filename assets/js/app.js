const $ = require('jquery');
const fs = nw.require('fs');
const globals = require('./assets/js/common/globals');
//
const sceneEditor = nw.require('./assets/js/objects/sceneEditor');
const animator = nw.require('./assets/js/objects/animator');
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

    $(document).keydown(function (e) {
      //ctrl
      globals.keysIsPressed.ctrl = e.ctrlKey;
      //shift
      globals.keysIsPressed.shift = e.shiftKey;
      //alt
      globals.keysIsPressed.alt = e.altKey;
    });

    $(document).keyup(function (e) {
      //ctrl
      globals.keysIsPressed.ctrl = e.ctrlKey;
      //shift
      globals.keysIsPressed.shift = e.shiftKey;
      //alt
      globals.keysIsPressed.alt = e.altKey;
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
    $("#app").css("display", "flex");
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
      //for sceneEditor
      if (this.id == "sceneEditorTab") {
        sceneEditor.refreshEditor();
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
    $("#scriptEditor").load("./views/scriptEditor.html");
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