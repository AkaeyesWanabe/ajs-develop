const header = nw.require('./assets/js/objects/header');

$(document).ready(function () {
    //for all appMenuItemCheck
    let objs = $(".appMenuItemSubMenu div[check]");
    for (let i = 0; i < objs.length; i++) {
        if (objs[i].getAttribute("check") == "true") {
            objs[i].children[1].style.display = "block";
        }
    }

    //click event to toggle checking state
    $(".appMenuItemSubMenu div[check]").click(function () {
        if (this.getAttribute("check") == null) return;
        //
        let check = this.getAttribute("check") == "true" ? true : false;
        if (!check) {
            this.setAttribute("check", "true");
            this.children[1].style.display = "block";
        }
        else {
            this.setAttribute("check", "false");
            this.children[1].style.display = "none";
        }
    });

    //minimize event
    $("#appMinimizeBtn").click(function () {
        win.minimize();
    });
    //maximize event
    $("#appMaximizeBtn").click(function () {
        if (!globals.app.isMaximized) {
            win.maximize();
            globals.app.isMaximized = true;
        }
        else {
            win.unmaximize();
            globals.app.isMaximized = false;
        }
    });
    //close event
    $("#appCloseBtn").click(function () {
        app.quit();
    });



    /*-------------------
    appMenu
    -------------------*/
    $("#openProjectBtn").click(function () {
        globals.action = "load-project";
        //open file loader
        FolderInput.click();
    });

    $("#FolderInput").change(function () {
        if (globals.action = "load-project") {
            header.loadProject(this.value);
        }
    });
});
