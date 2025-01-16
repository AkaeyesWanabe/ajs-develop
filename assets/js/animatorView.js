$(document).ready(function () {
    setTimeout(function () {
        $('.subWinCloser').click(function () {
            $("#" + this.getAttribute('target')).css("display", "none");
        });
        //
        $("#animatorZoom")[0].oninput = function () {
            animator.applyImageZoom(this.value);
        };
    }, 4000);
});