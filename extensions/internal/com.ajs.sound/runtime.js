/**
 * Sound System Extension
 * Gère tous les sons et musiques du jeu
 */
const runtime = {
    name: "Sound System",
    version: "1.0.0",
    type: "system",

    /**
     * Initialisation du système audio
     */
    onCreated(gameObject, api) {

        gameObject.internal.audio = {
            // Volumes
            masterVolume: gameObject.properties.masterVolume || 1,
            soundVolume: gameObject.properties.soundVolume || 1,
            musicVolume: gameObject.properties.musicVolume || 1,

            // Sons en cours
            activeSounds: new Map(),
            nextSoundId: 0,

            // Musique actuelle
            currentMusic: null,
            musicPath: null
        };
    },

    /**
     * Mise à jour du système audio
     */
    onUpdate(gameObject, deltaTime, api) {
        const audio = gameObject.internal.audio;

        // Nettoyer les sons terminés
        audio.activeSounds.forEach((sound, id) => {
            if (sound.ended) {
                audio.activeSounds.delete(id);
            }
        });
    },

    // ========== API ==========

    /**
     * Jouer un son
     */
    playSound(gameObject, soundPath, volume = 1, loop = false) {
        const audio = gameObject.internal.audio;

        try {
            const sound = new Audio(soundPath);
            sound.volume = volume * audio.soundVolume * audio.masterVolume;
            sound.loop = loop;

            const soundId = audio.nextSoundId++;
            audio.activeSounds.set(soundId, sound);

            sound.play().catch(err => {
                console.error('[Sound] Failed to play sound:', soundPath, err);
            });

            return soundId;
        } catch (err) {
            console.error('[Sound] Error creating sound:', soundPath, err);
            return null;
        }
    },

    /**
     * Arrêter un son
     */
    stopSound(gameObject, soundId) {
        const audio = gameObject.internal.audio;
        const sound = audio.activeSounds.get(soundId);

        if (sound) {
            sound.pause();
            sound.currentTime = 0;
            audio.activeSounds.delete(soundId);
        }
    },

    /**
     * Arrêter tous les sons
     */
    stopAllSounds(gameObject) {
        const audio = gameObject.internal.audio;

        audio.activeSounds.forEach((sound) => {
            sound.pause();
            sound.currentTime = 0;
        });

        audio.activeSounds.clear();
    },

    /**
     * Jouer une musique de fond
     */
    playMusic(gameObject, musicPath, volume = 1, loop = true) {
        const audio = gameObject.internal.audio;

        // Arrêter la musique actuelle
        if (audio.currentMusic) {
            audio.currentMusic.pause();
        }

        try {
            const music = new Audio(musicPath);
            music.volume = volume * audio.musicVolume * audio.masterVolume;
            music.loop = loop;

            audio.currentMusic = music;
            audio.musicPath = musicPath;

            music.play().catch(err => {
                console.error('[Sound] Failed to play music:', musicPath, err);
            });
        } catch (err) {
            console.error('[Sound] Error creating music:', musicPath, err);
        }
    },

    /**
     * Arrêter la musique
     */
    stopMusic(gameObject) {
        const audio = gameObject.internal.audio;

        if (audio.currentMusic) {
            audio.currentMusic.pause();
            audio.currentMusic = null;
            audio.musicPath = null;
        }
    },

    /**
     * Mettre en pause la musique
     */
    pauseMusic(gameObject) {
        const audio = gameObject.internal.audio;

        if (audio.currentMusic) {
            audio.currentMusic.pause();
        }
    },

    /**
     * Reprendre la musique
     */
    resumeMusic(gameObject) {
        const audio = gameObject.internal.audio;

        if (audio.currentMusic) {
            audio.currentMusic.play().catch(err => {
                console.error('[Sound] Failed to resume music:', err);
            });
        }
    },

    /**
     * Définir le volume master
     */
    setMasterVolume(gameObject, volume) {
        const audio = gameObject.internal.audio;
        audio.masterVolume = Math.max(0, Math.min(1, volume));

        // Mettre à jour la musique en cours
        if (audio.currentMusic) {
            audio.currentMusic.volume = audio.musicVolume * audio.masterVolume;
        }

        // Mettre à jour tous les sons en cours
        audio.activeSounds.forEach(sound => {
            // Note: le volume des sons déjà joués ne sera mis à jour que pour les nouveaux sons
        });
    },

    /**
     * Définir le volume des effets sonores
     */
    setSoundVolume(gameObject, volume) {
        const audio = gameObject.internal.audio;
        audio.soundVolume = Math.max(0, Math.min(1, volume));
    },

    /**
     * Définir le volume de la musique
     */
    setMusicVolume(gameObject, volume) {
        const audio = gameObject.internal.audio;
        audio.musicVolume = Math.max(0, Math.min(1, volume));

        // Mettre à jour la musique en cours
        if (audio.currentMusic) {
            audio.currentMusic.volume = audio.musicVolume * audio.masterVolume;
        }
    },

    /**
     * Obtenir les volumes actuels
     */
    getVolumes(gameObject) {
        const audio = gameObject.internal.audio;
        return {
            master: audio.masterVolume,
            sound: audio.soundVolume,
            music: audio.musicVolume
        };
    },

    /**
     * Vérifier si une musique est en cours
     */
    isMusicPlaying(gameObject) {
        const audio = gameObject.internal.audio;
        return audio.currentMusic && !audio.currentMusic.paused;
    }
};

module.exports = runtime;
