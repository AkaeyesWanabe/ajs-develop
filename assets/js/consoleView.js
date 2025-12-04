const consoleModule = nw.require('./assets/js/objects/console');

$(document).ready(function () {
    // Initialize console interception FIRST (before any other code runs)
    consoleModule.interceptConsole();

    // Clear button
    $("#consoleClearBtn").click(function () {
        consoleModule.clear();
    });

    // Filter buttons
    $(".consoleFilterBtn").click(function () {
        const filter = $(this).data('filter');

        // Update active state
        $(".consoleFilterBtn").removeClass('active');
        $(this).addClass('active');

        // Apply filter
        consoleModule.filter(filter);
    });

    // Log a welcome message
    setTimeout(() => {
    }, 100);
});

// Make console globally available for easy logging from anywhere
if (typeof window !== 'undefined') {
    window.ajsConsole = consoleModule;
}
