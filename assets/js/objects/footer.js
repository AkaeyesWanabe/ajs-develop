const $ = nw.require('jquery');
const globals = nw.require('./assets/js/common/globals');

module.exports = {
    refreshStatusDetails() {
        let dts = document.querySelectorAll("#statusDetails>a");
        dts.forEach(function (item) {
            if (item.getAttribute("tab") == globals.app.tabName) {
                item.style.display = "block";
            }
            else {
                item.style.display = "none";
            }
        });
    },


};