const $ = nw.require('jquery');
const globals = nw.require('./assets/js/common/globals');

module.exports = {
    editor: null,
    //
    init() {
        this.editor = ace.edit("codeEditor");
        this.editor.setTheme("ace/theme/ajs_dark");
        this.editor.session.setMode("ace/mode/javascript");
        this.editor.setOptions({
            fontSize: "11pt",
            enableBasicAutocompletion: true,
            enableSnippets: true,
            enableLiveAutocompletion: true,
        });
    },

    openFile(path, filename, file_extension, data) {
        let tabs = document.querySelector("#codeEditorTabs");
        let tabItems = document.querySelectorAll(".codeEditorTab");
        //
        let fileExists = false;
        //check if file is existing
        tabItems.forEach(function (item) {
            if (item.getAttribute("path") == path) {
                fileExists = true;
                return;
            }
        });
        //on existing file
        if (fileExists) {
            return;
        }
        //
        //on new file
        if (tabItems.length == 0) {
            $(".codes").attr("visible", "true");
            $("#codeEditorTabs").attr("visible", "true");
            $("#noFileOpened").attr("visible", "false");
        }
        //
        //open file in codes editor
        let ficon = globals.user.fileIconTheme.data.files.default;
        //
        if (file_extension == ".js" || file_extension == ".jsx" || file_extension == ".mjs" || file_extension == ".cjs") {
            let jsSession = ace.createEditSession(data.toString(), "ace/mode/javascript");
            this.editor.setSession(jsSession);
            ficon = globals.user.fileIconTheme.data.files.javascript;
        }
        //
        //
        tabItems.forEach(function (item) {
            item.setAttribute("selected", "false");
        });
        //create tab for this file
        //
        let elem = `
        <div class="codeEditorTab" index="` + tabItems.length + `" path="` + path + `"  selected="true">
            <div class="body">
                <img src="./assets/files-icons-themes/` + globals.user.fileIconTheme.theme + `/` + ficon + `" class="icon"/>
                <a class="title">`+ filename + `</a>
                <i class="close bi bi-x"></i>
                <i class="save bi bi-circle-fill"></i>
            </div >
        </div >
    `;
        //
        tabs.innerHTML = tabs.innerHTML + elem.trim();
        //all events for each tab
        setTimeout(function () {
            $(".codeEditorTab").click(function () {
                let tabItems = document.querySelectorAll(".codeEditorTab");
                //
                tabItems.forEach(function (item) {
                    item.setAttribute("selected", "false");
                });
                //
                this.setAttribute("selected", "true");
            });
        }, 1);
    }
};