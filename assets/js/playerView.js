// Load modules as global variables (avoid redeclaration errors on hot reload)
window.player = window.player || nw.require('./assets/js/objects/player');
window.sceneEditor = window.sceneEditor || nw.require('./assets/js/objects/sceneEditor');
window.globals = window.globals || nw.require('./assets/js/common/globals');

// Use short aliases for convenience (non-const to avoid redeclaration)
var player = window.player;
var sceneEditor = window.sceneEditor;
var globals = window.globals;

$(document).ready(function () {
    // Initialize player when canvas is ready
    setTimeout(() => {
        player.init();
    }, 100);

    // Play button
    $("#playBtn").click(function () {
        // Load current scene from scene editor if available
        if (sceneEditor.sceneData && sceneEditor.sceneData.properties) {
            player.loadScene(sceneEditor.sceneData);
            player.play();
        } else {
            alert('No scene opened. Please open a scene in the Scene Editor first.');
        }
    });

    // Pause button
    $("#pauseBtn").click(function () {
        player.pause();
    });

    // Stop button
    $("#stopBtn").click(function () {
        player.stop();
    });

    // Restart button
    $("#restartBtn").click(function () {
        player.restart();
    });

    // Debug toggle button
    $("#debugToggleBtn").click(function () {
        player.toggleDebug();
        $(this).toggleClass('active');
    });

    // Keyboard shortcuts
    $(document).keydown(function (e) {
        // F5 - Play/Pause
        if (e.key === 'F5') {
            e.preventDefault();
            if (!player.isPlaying) {
                $("#playBtn").click();
            } else if (player.isPaused) {
                $("#playBtn").click();
            } else {
                $("#pauseBtn").click();
            }
        }
        // Escape - Stop
        else if (e.key === 'Escape') {
            if (player.isPlaying) {
                player.stop();
            }
        }
    });

    // Auto-load scene when scene editor loads a scene
    // Listen for scene changes (we'll need to add an event system later)
});
