import Engine from "./Engine";

$(function () {
    checkWidth();
    new Engine().start(60);
});

$(window).on("resize", checkWidth);

let alerted = false;
function checkWidth() {
    const width = $(window).width();
    if (!alerted && width && width < 800) {
        alert(
            "Welcome to the Life Engine! Be aware the website is not built for mobile, so try on desktop for the best experience!"
        );
        alerted = true;
    }
}
