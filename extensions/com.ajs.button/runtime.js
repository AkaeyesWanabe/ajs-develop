const runtime = {
    name: "Button Runtime",
    version: "1.0.0",

    /**
     * Appelé à la création du bouton
     */
    onCreated(gameObject, api) {
        // État interne du bouton
        gameObject.internal.button = {
            isHovered: false,
            isPressed: false,
            wasPressed: false,
            onClick: null, // Callback de clic
            onHover: null, // Callback de survol
            onLeave: null  // Callback de sortie
        };

        // Styles du bouton
        gameObject.internal.styles = {
            normalColor: gameObject.properties.bkgColor || gameObject.properties.backgroundColor || '#4CAF50',
            hoverColor: gameObject.properties.hoverColor || '#45a049',
            pressedColor: gameObject.properties.pressedColor || '#3d8b40',
            textColor: gameObject.properties.textColor || '#ffffff',
            fontSize: gameObject.properties.fontSize || 16,
            fontFamily: gameObject.properties.fontFamily || 'Arial',
            fontWeight: gameObject.properties.fontWeight || 'normal',
            fontStyle: gameObject.properties.fontStyle || 'normal',
            textDecoration: gameObject.properties.textDecoration || 'none',
            textTransform: gameObject.properties.textTransform || 'none',
            letterSpacing: gameObject.properties.letterSpacing || 0,
            wordSpacing: gameObject.properties.wordSpacing || 0,
            textShadowX: gameObject.properties.textShadowX || 0,
            textShadowY: gameObject.properties.textShadowY || 1,
            textShadowBlur: gameObject.properties.textShadowBlur || 2,
            textShadowColor: gameObject.properties.textShadowColor || 'rgba(0,0,0,0.3)',
            text: gameObject.properties.text || 'Button',
            borderRadius: gameObject.properties.borderRadius !== undefined ? gameObject.properties.borderRadius : 8,
            borderWidth: gameObject.properties.borderWidth !== undefined ? gameObject.properties.borderWidth : 2,
            borderColor: gameObject.properties.borderColor || '#2e7d32'
        };

    },

    /**
     * Mise à jour du bouton (détection des interactions)
     */
    onUpdate(gameObject, deltaTime, api) {
        const btn = gameObject.internal.button;
        const rect = gameObject.getRect();

        // Obtenir la position de la souris
        const mousePos = api.input.getMousePosition();

        // Vérifier si la souris est au-dessus du bouton
        const isHovered = api.physics.pointInRect(mousePos.x, mousePos.y, gameObject);

        // Détecter l'entrée du hover
        if (isHovered && !btn.isHovered) {
            btn.isHovered = true;
            if (btn.onHover) {
                btn.onHover(gameObject);
            }
        }

        // Détecter la sortie du hover
        if (!isHovered && btn.isHovered) {
            btn.isHovered = false;
            btn.isPressed = false;
            if (btn.onLeave) {
                btn.onLeave(gameObject);
            }
        }

        // Détecter le clic
        if (isHovered) {
            if (api.input.isMouseButtonPressed(0)) {
                btn.isPressed = true;
                btn.wasPressed = true;
            } else if (btn.wasPressed) {
                // Bouton relâché -> clic
                btn.isPressed = false;
                btn.wasPressed = false;

                // Appeler le callback onClick
                if (btn.onClick) {
                    btn.onClick(gameObject);
                }

            }
        } else {
            btn.isPressed = false;
            btn.wasPressed = false;
        }
    },

    /**
     * Rendu du bouton avec états visuels
     */
    onRender(gameObject, ctx, api) {
        const { x, y, width, height, angle, opacity } = gameObject.getTransform();

        if (!gameObject.isVisible) {
            return;
        }

        const btn = gameObject.internal.button;
        const styles = gameObject.internal.styles;
        const isDisabled = !gameObject.isActive;

        ctx.save();

        // Opacité (réduite si désactivé)
        const finalOpacity = isDisabled ? (opacity || 1) * 0.5 : (opacity || 1);
        ctx.globalAlpha = finalOpacity;

        // Transformation
        ctx.translate(x + width / 2, y + height / 2);

        if (angle) {
            ctx.rotate((angle * Math.PI) / 180);
        }

        // Offset pour l'effet pressed
        const pressedOffset = btn.isPressed && !isDisabled ? 2 : 0;
        ctx.translate(0, pressedOffset);

        // Bordures arrondies
        const borderRadius = Math.min(gameObject.properties.borderRadius || 8, width / 2, height / 2);

        // === Dessiner l'ombre portée ===
        if (!btn.isPressed && !isDisabled) {
            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 4;

            this.drawRoundedRect(ctx, -width / 2, -height / 2, width, height, borderRadius);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.fill();
            ctx.restore();
        }

        // === Choisir la couleur selon l'état ===
        let bgColor = styles.normalColor;
        if (isDisabled) {
            bgColor = '#cccccc';
        } else if (btn.isPressed) {
            bgColor = styles.pressedColor;
        } else if (btn.isHovered) {
            bgColor = styles.hoverColor;
        }

        // === Dessiner le fond avec gradient ===
        this.drawRoundedRect(ctx, -width / 2, -height / 2, width, height, borderRadius);

        if (!isDisabled) {
            // Gradient subtil pour donner de la profondeur
            const gradient = ctx.createLinearGradient(0, -height / 2, 0, height / 2);
            gradient.addColorStop(0, this.lightenColor(bgColor, 10));
            gradient.addColorStop(1, this.darkenColor(bgColor, 10));
            ctx.fillStyle = gradient;
        } else {
            ctx.fillStyle = bgColor;
        }
        ctx.fill();

        // === Effet hover avec gradient overlay ===
        if (btn.isHovered && !isDisabled) {
            this.drawRoundedRect(ctx, -width / 2, -height / 2, width, height, borderRadius);
            const hoverGradient = ctx.createLinearGradient(0, -height / 2, 0, height / 2);
            hoverGradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
            hoverGradient.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
            ctx.fillStyle = hoverGradient;
            ctx.fill();
        }

        // === Dessiner la bordure ===
        const borderColor = gameObject.properties.borderColor || '#000000';
        const borderWidth = gameObject.properties.borderWidth !== undefined ? gameObject.properties.borderWidth : 2;

        if (borderWidth > 0) {
            this.drawRoundedRect(ctx, -width / 2, -height / 2, width, height, borderRadius);
            ctx.strokeStyle = isDisabled ? '#999999' : borderColor;
            ctx.lineWidth = borderWidth;
            ctx.stroke();
        }

        // === Highlight interne (effet 3D) ===
        if (!btn.isPressed && !isDisabled) {
            this.drawRoundedRect(ctx, -width / 2 + 1, -height / 2 + 1, width - 2, Math.max(height * 0.3, 10), borderRadius - 1);
            const highlightGradient = ctx.createLinearGradient(0, -height / 2, 0, -height / 4);
            highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
            highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = highlightGradient;
            ctx.fill();
        }

        // === Dessiner le texte ===
        const textColor = isDisabled ? '#666666' : styles.textColor;

        // Apply text transform
        let displayText = this.applyTextTransform(styles.text, styles.textTransform);

        // Configure font with all properties
        const fontWeight = styles.fontWeight || 'normal';
        const fontStyle = styles.fontStyle || 'normal';
        const fontFamily = styles.fontFamily || 'Arial';
        ctx.font = `${fontStyle} ${fontWeight} ${styles.fontSize}px ${fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Configure text shadow
        const textShadowX = styles.textShadowX || 0;
        const textShadowY = styles.textShadowY || 1;
        const textShadowBlur = styles.textShadowBlur || 2;
        const textShadowColor = styles.textShadowColor || 'rgba(0,0,0,0.3)';

        if (!isDisabled && (textShadowX !== 0 || textShadowY !== 0 || textShadowBlur !== 0)) {
            ctx.shadowColor = textShadowColor;
            ctx.shadowBlur = textShadowBlur;
            ctx.shadowOffsetX = textShadowX;
            ctx.shadowOffsetY = textShadowY;
        }

        // Draw text with custom spacing if needed
        const letterSpacing = styles.letterSpacing || 0;
        const wordSpacing = styles.wordSpacing || 0;

        if (letterSpacing !== 0 || wordSpacing !== 0) {
            // Measure total width for centering
            const totalWidth = this.measureTextWithSpacing(ctx, displayText, letterSpacing, wordSpacing);
            this.drawTextWithSpacing(ctx, displayText, -totalWidth / 2, 0, letterSpacing, wordSpacing, textColor);
        } else {
            ctx.fillStyle = textColor;
            ctx.fillText(displayText, 0, 0);
        }

        // Draw text decoration
        const textDecoration = styles.textDecoration || 'none';
        if (textDecoration !== 'none') {
            // Reset shadow for decoration line
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;

            const textWidth = letterSpacing !== 0 || wordSpacing !== 0
                ? this.measureTextWithSpacing(ctx, displayText, letterSpacing, wordSpacing)
                : ctx.measureText(displayText).width;

            this.drawTextDecoration(ctx, textDecoration, -textWidth / 2, 0, textWidth, styles.fontSize, textColor);
        }

        ctx.restore();
    },

    /**
     * Dessiner un rectangle avec bordures arrondies
     */
    drawRoundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    },

    /**
     * Éclaircir une couleur hexadécimale
     */
    lightenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, (num >> 16) + amt);
        const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
        const B = Math.min(255, (num & 0x0000FF) + amt);
        return '#' + (0x1000000 + (R << 16) + (G << 8) + B).toString(16).slice(1);
    },

    /**
     * Assombrir une couleur hexadécimale
     */
    darkenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, (num >> 16) - amt);
        const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
        const B = Math.max(0, (num & 0x0000FF) - amt);
        return '#' + (0x1000000 + (R << 16) + (G << 8) + B).toString(16).slice(1);
    },

    /**
     * Apply text transform (uppercase, lowercase, capitalize)
     */
    applyTextTransform(text, transform) {
        switch (transform) {
            case 'uppercase':
                return text.toUpperCase();
            case 'lowercase':
                return text.toLowerCase();
            case 'capitalize':
                return text.replace(/\b\w/g, char => char.toUpperCase());
            default:
                return text;
        }
    },

    /**
     * Measure text width with letter and word spacing
     */
    measureTextWithSpacing(ctx, text, letterSpacing, wordSpacing) {
        if (letterSpacing === 0 && wordSpacing === 0) {
            return ctx.measureText(text).width;
        }

        let totalWidth = 0;
        const words = text.split(' ');

        words.forEach((word, wordIndex) => {
            for (let i = 0; i < word.length; i++) {
                totalWidth += ctx.measureText(word[i]).width;
                if (i < word.length - 1) {
                    totalWidth += letterSpacing;
                }
            }
            // Add word spacing between words
            if (wordIndex < words.length - 1) {
                totalWidth += ctx.measureText(' ').width + wordSpacing;
            }
        });

        return totalWidth;
    },

    /**
     * Draw text with custom letter and word spacing
     */
    drawTextWithSpacing(ctx, text, x, y, letterSpacing, wordSpacing, color) {
        let currentX = x;
        const words = text.split(' ');

        ctx.fillStyle = color;

        words.forEach((word, wordIndex) => {
            for (let i = 0; i < word.length; i++) {
                const char = word[i];
                ctx.fillText(char, currentX, y);
                currentX += ctx.measureText(char).width + letterSpacing;
            }

            // Add space and word spacing between words
            if (wordIndex < words.length - 1) {
                currentX += ctx.measureText(' ').width + wordSpacing;
            }
        });
    },

    /**
     * Draw text decoration (underline, line-through, overline)
     */
    drawTextDecoration(ctx, decoration, x, y, lineWidth, fontSize, color) {
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1, fontSize / 16);
        ctx.beginPath();

        switch (decoration) {
            case 'underline':
                // Draw line below text
                const underlineY = y + fontSize * 0.55;
                ctx.moveTo(x, underlineY);
                ctx.lineTo(x + lineWidth, underlineY);
                break;

            case 'line-through':
                // Draw line through middle of text
                const lineThroughY = y;
                ctx.moveTo(x, lineThroughY);
                ctx.lineTo(x + lineWidth, lineThroughY);
                break;

            case 'overline':
                // Draw line above text
                const overlineY = y - fontSize * 0.55;
                ctx.moveTo(x, overlineY);
                ctx.lineTo(x + lineWidth, overlineY);
                break;
        }

        ctx.stroke();
    },

    /**
     * Destruction du bouton
     */
    onDestroyed(gameObject, api) {
    },

    // ========== API Methods ==========

    /**
     * Définir le callback de clic
     * @param {GameObject} gameObject - Le bouton
     * @param {Function} callback - Fonction appelée au clic
     */
    setOnClick(gameObject, callback) {
        if (gameObject.internal.button) {
            gameObject.internal.button.onClick = callback;
        }
    },

    /**
     * Définir le callback de hover
     * @param {GameObject} gameObject - Le bouton
     * @param {Function} callback - Fonction appelée au survol
     */
    setOnHover(gameObject, callback) {
        if (gameObject.internal.button) {
            gameObject.internal.button.onHover = callback;
        }
    },

    /**
     * Définir le callback de sortie
     * @param {GameObject} gameObject - Le bouton
     * @param {Function} callback - Fonction appelée à la sortie
     */
    setOnLeave(gameObject, callback) {
        if (gameObject.internal.button) {
            gameObject.internal.button.onLeave = callback;
        }
    },

    /**
     * Changer le texte du bouton
     * @param {GameObject} gameObject - Le bouton
     * @param {string} text - Nouveau texte
     */
    setText(gameObject, text) {
        if (gameObject.internal.styles) {
            gameObject.internal.styles.text = text;
        }
    },

    /**
     * Activer/désactiver le bouton
     * @param {GameObject} gameObject - Le bouton
     * @param {boolean} enabled - Activé ou non
     */
    setEnabled(gameObject, enabled) {
        gameObject.isActive = enabled;
        if (!enabled && gameObject.internal.button) {
            gameObject.internal.button.isHovered = false;
            gameObject.internal.button.isPressed = false;
        }
    }
};

module.exports = runtime;
