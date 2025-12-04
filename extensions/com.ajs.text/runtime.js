const runtime = {
    name: "Text Runtime",
    version: "1.0.0",

    /**
     * Appelé à la création du texte
     */
    onCreated(gameObject, api) {
        // Initialiser le cache de texte pré-rendu pour meilleures performances
        gameObject.internal.textCache = {
            cachedText: null,
            cachedStyle: null,
            needsRedraw: true
        };
    },

    /**
     * Mise à jour du texte
     */
    onUpdate(gameObject, deltaTime, api) {
        // Pas de logique de mise à jour pour les textes statiques
        // On peut ajouter des effets d'animation ici (clignotement, défilement, etc.)
    },

    /**
     * Rendu du texte avec support complet du style
     */
    onRender(gameObject, ctx, api) {
        const { x, y, width, height, angle, opacity } = gameObject.getTransform();

        if (!gameObject.isVisible) {
            return;
        }

        const props = gameObject.properties;
        let text = props.text || 'Hello World';
        const fontSize = props.fontSize || 24;
        const fontFamily = props.fontFamily || 'Arial';
        const fontWeight = props.fontWeight || 'normal';
        const fontStyle = props.fontStyle || 'normal';
        const color = props.color || '#000000';
        const textAlign = props.textAlign || 'left';
        const verticalAlign = props.verticalAlign || 'top';
        const lineHeight = (props.lineHeight || 1.2) * fontSize;
        const strokeWidth = props.strokeWidth || 0;
        const strokeColor = props.strokeColor || '#000000';

        // New CSS properties
        const textDecoration = props.textDecoration || 'none';
        const textTransform = props.textTransform || 'none';
        const letterSpacing = props.letterSpacing || 0;
        const wordSpacing = props.wordSpacing || 0;
        const textShadowX = props.textShadowX || 0;
        const textShadowY = props.textShadowY || 0;
        const textShadowBlur = props.textShadowBlur || 0;
        const textShadowColor = props.textShadowColor || 'rgba(0,0,0,0.5)';

        // Apply text transform
        text = this.applyTextTransform(text, textTransform);

        ctx.save();

        // Opacité
        ctx.globalAlpha = opacity !== undefined ? opacity : 1;

        // Transformation pour rotation
        if (angle && angle !== 0) {
            ctx.translate(x + width / 2, y + height / 2);
            ctx.rotate((angle * Math.PI) / 180);
            ctx.translate(-width / 2, -height / 2);
        } else {
            ctx.translate(x, y);
        }

        // Configuration de la police
        const font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
        ctx.font = font;
        ctx.textBaseline = 'top';

        // Configure text shadow
        if (textShadowX !== 0 || textShadowY !== 0 || textShadowBlur !== 0) {
            ctx.shadowOffsetX = textShadowX;
            ctx.shadowOffsetY = textShadowY;
            ctx.shadowBlur = textShadowBlur;
            ctx.shadowColor = textShadowColor;
        }

        // Séparer le texte en lignes
        const lines = text.split('\n');
        const wrappedLines = [];

        // Word wrapping with letterSpacing and wordSpacing consideration
        lines.forEach(line => {
            if (line === '') {
                wrappedLines.push('');
                return;
            }

            const words = line.split(' ');
            let currentLine = '';

            words.forEach(word => {
                const testLine = currentLine + (currentLine ? ' ' : '') + word;
                const lineWidth = this.measureTextWithSpacing(ctx, testLine, letterSpacing, wordSpacing);

                if (lineWidth > width && currentLine) {
                    wrappedLines.push(currentLine);
                    currentLine = word;
                } else {
                    currentLine = testLine;
                }
            });

            if (currentLine) {
                wrappedLines.push(currentLine);
            }
        });

        // Calculer la hauteur totale du texte
        const totalTextHeight = wrappedLines.length * lineHeight;

        // Position verticale de départ selon l'alignement
        let startY = 0;
        switch (verticalAlign) {
            case 'top':
                startY = 0;
                break;
            case 'middle':
                startY = (height - totalTextHeight) / 2;
                break;
            case 'bottom':
                startY = height - totalTextHeight;
                break;
        }

        // Dessiner chaque ligne
        wrappedLines.forEach((line, index) => {
            const lineY = startY + (index * lineHeight);
            const lineWidth = this.measureTextWithSpacing(ctx, line, letterSpacing, wordSpacing);

            // Calculer la position X selon l'alignement horizontal
            let lineX = 0;
            switch (textAlign) {
                case 'left':
                    lineX = 0;
                    break;
                case 'center':
                    lineX = (width - lineWidth) / 2;
                    break;
                case 'right':
                    lineX = width - lineWidth;
                    break;
            }

            // Dessiner le texte avec espacement personnalisé
            if (letterSpacing !== 0 || wordSpacing !== 0) {
                this.drawTextWithSpacing(ctx, line, lineX, lineY, letterSpacing, wordSpacing, strokeWidth, strokeColor, color);
            } else {
                // Dessiner normalement sans espacement
                if (strokeWidth > 0) {
                    ctx.strokeStyle = strokeColor;
                    ctx.lineWidth = strokeWidth * 2;
                    ctx.lineJoin = 'round';
                    ctx.miterLimit = 2;
                    ctx.strokeText(line, lineX, lineY);
                }
                ctx.fillStyle = color;
                ctx.fillText(line, lineX, lineY);
            }

            // Dessiner la décoration de texte
            if (textDecoration !== 'none') {
                this.drawTextDecoration(ctx, textDecoration, lineX, lineY, lineWidth, fontSize, color);
            }
        });

        ctx.restore();
    },

    /**
     * Destruction du texte
     */
    onDestroyed(gameObject, api) {
        // Nettoyer le cache
        if (gameObject.internal.textCache) {
            delete gameObject.internal.textCache;
        }
    },

    // ========== Helper Methods ==========

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
    drawTextWithSpacing(ctx, text, x, y, letterSpacing, wordSpacing, strokeWidth, strokeColor, color) {
        let currentX = x;
        const words = text.split(' ');

        words.forEach((word, wordIndex) => {
            for (let i = 0; i < word.length; i++) {
                const char = word[i];

                // Draw stroke
                if (strokeWidth > 0) {
                    ctx.strokeStyle = strokeColor;
                    ctx.lineWidth = strokeWidth * 2;
                    ctx.lineJoin = 'round';
                    ctx.miterLimit = 2;
                    ctx.strokeText(char, currentX, y);
                }

                // Draw character
                ctx.fillStyle = color;
                ctx.fillText(char, currentX, y);

                // Move to next character position
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
                const underlineY = y + fontSize * 1.1;
                ctx.moveTo(x, underlineY);
                ctx.lineTo(x + lineWidth, underlineY);
                break;

            case 'line-through':
                // Draw line through middle of text
                const lineThroughY = y + fontSize * 0.5;
                ctx.moveTo(x, lineThroughY);
                ctx.lineTo(x + lineWidth, lineThroughY);
                break;

            case 'overline':
                // Draw line above text
                const overlineY = y;
                ctx.moveTo(x, overlineY);
                ctx.lineTo(x + lineWidth, overlineY);
                break;
        }

        ctx.stroke();
    },

    // ========== API Methods ==========

    /**
     * Changer le texte dynamiquement
     * @param {GameObject} gameObject - L'objet texte
     * @param {string} newText - Nouveau texte
     */
    setText(gameObject, newText) {
        gameObject.properties.text = newText;
        if (gameObject.internal.textCache) {
            gameObject.internal.textCache.needsRedraw = true;
        }
    },

    /**
     * Changer la couleur du texte
     * @param {GameObject} gameObject - L'objet texte
     * @param {string} color - Nouvelle couleur (format hex)
     */
    setColor(gameObject, color) {
        gameObject.properties.color = color;
        if (gameObject.internal.textCache) {
            gameObject.internal.textCache.needsRedraw = true;
        }
    },

    /**
     * Changer la taille de la police
     * @param {GameObject} gameObject - L'objet texte
     * @param {number} fontSize - Nouvelle taille
     */
    setFontSize(gameObject, fontSize) {
        gameObject.properties.fontSize = fontSize;
        if (gameObject.internal.textCache) {
            gameObject.internal.textCache.needsRedraw = true;
        }
    },

    /**
     * Obtenir le texte actuel
     * @param {GameObject} gameObject - L'objet texte
     * @returns {string} Texte actuel
     */
    getText(gameObject) {
        return gameObject.properties.text || '';
    }
};

module.exports = runtime;
