ace.define("ace/theme/ajs_dark-css", ["require", "exports", "module"], function (require, exports, module) {
    module.exports = ``;

});

ace.define("ace/theme/ajs_dark", ["require", "exports", "module", "ace/theme/ajs_dark-css", "ace/lib/dom"], function (require, exports, module) {
    exports.isDark = true;
    exports.cssClass = "ace-ajs_dark";
    exports.cssText = require("./ajs_dark-css");
    var dom = require("../lib/dom");
    dom.importCssString(exports.cssText, exports.cssClass, false);

}); (function () {
    ace.require(["ace/theme/ajs_dark"], function (m) {
        if (typeof module == "object" && typeof exports == "object" && module) {
            module.exports = m;
        }
    });
})();