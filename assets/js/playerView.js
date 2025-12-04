// PlayerView - Handles UI events for the player
// This function is called by app.js AFTER player is initialized
// No timing checks needed - guaranteed to be called when ready

window.initPlayerHandlers = function() {

    // Verify button exists
    const playBtn = document.getElementById('playBtn');

    // Play button - Play current scene
    $("#playBtn").click(async function () {

        if (window.sceneEditor) {

            if (window.sceneEditor.sceneData) {
            }

        }

        // If already playing, resume from pause
        if (window.player.isPlaying && window.player.isPaused) {
            window.player.play();
            return;
        }

        // Load current scene from scene editor if available
        const hasSceneData = window.sceneEditor && window.sceneEditor.sceneData && Object.keys(window.sceneEditor.sceneData).length > 0;
        const hasProperties = hasSceneData && window.sceneEditor.sceneData.properties;


        if (hasSceneData && hasProperties) {
            try {
                await window.player.loadScene(window.sceneEditor.sceneData);
                window.player.play();
            } catch (err) {
                console.error('[PlayerView] Failed to load scene:', err);
                alert('Failed to load scene: ' + err.message);
            }
        } else {
            console.error('[PlayerView] ❌ Scene data NOT valid!');
            console.error('[PlayerView] Reason - hasSceneData:', hasSceneData, 'hasProperties:', hasProperties);
            if (window.sceneEditor?.sceneData) {
                console.error('[PlayerView] sceneData contents:', JSON.stringify(window.sceneEditor.sceneData, null, 2));
            }
            alert('No scene opened. Please open a scene in the Scene Editor first.');
        }
    });

    // Play dropdown button - Show menu
    $("#playDropdownBtn").click(function (e) {
        e.stopPropagation();
        const menu = $("#playDropdownMenu");
        menu.toggle();
    });

    // Close dropdown when clicking outside
    $(document).click(function (e) {
        if (!$(e.target).closest('.playerBtnGroup').length) {
            $("#playDropdownMenu").hide();
        }
    });

    // Play Scene option (from dropdown)
    $("#playSceneBtn").click(function () {
        $("#playDropdownMenu").hide();
        $("#playBtn").click();
    });

    // Play from Main Scene option (from dropdown)
    $("#playFromMainBtn").click(async function () {
        $("#playDropdownMenu").hide();
        await window.player.playFromMainScene();
    });

    // Pause button
    $("#pauseBtn").click(function () {
        window.player.pause();
    });

    // Stop button
    $("#stopBtn").click(function () {
        window.player.stop();
    });

    // Restart button
    $("#restartBtn").click(function () {
        window.player.restart();
    });

    // Debug toggle button
    $("#debugToggleBtn").click(function () {
        window.player.toggleDebug();
        $(this).toggleClass('active');
    });

    // Keyboard shortcuts
    $(document).keydown(async function (e) {
        // F5 - Play Scene
        if (e.key === 'F5' && !e.shiftKey) {
            e.preventDefault();
            if (!window.player.isPlaying) {
                // Load and play scene
                if (window.sceneEditor.sceneData && window.sceneEditor.sceneData.properties) {
                    try {
                        await window.player.loadScene(window.sceneEditor.sceneData);
                        window.player.play();
                    } catch (err) {
                        console.error('[PlayerView] Failed to load scene:', err);
                        alert('Failed to load scene: ' + err.message);
                    }
                } else {
                    alert('No scene opened. Please open a scene in the Scene Editor first.');
                }
            } else if (window.player.isPaused) {
                window.player.play();
            } else {
                window.player.pause();
            }
        }
        // Shift+F5 - Play from Main Scene
        else if (e.key === 'F5' && e.shiftKey) {
            e.preventDefault();
            if (!window.player.isPlaying) {
                await window.player.playFromMainScene();
            }
        }
        // Escape - Stop
        else if (e.key === 'Escape') {
            if (window.player.isPlaying) {
                window.player.stop();
            }
        }
    });

};

// If player is already initialized when this script loads, init handlers immediately

if (window.player && window.player.canvas && document.getElementById('playerCanvas')) {
    window.initPlayerHandlers();
} else {
}
