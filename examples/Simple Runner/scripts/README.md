# Système de Scripting JavaScript

Le système de scripting vous permet d'attacher des comportements personnalisés à vos objets de jeu, similaire au système de MonoBehaviour de Unity.

## Comment utiliser les scripts

### 1. Créer un script

Créez un fichier `.js` dans le dossier `scripts/` de votre projet. Votre script doit être une classe qui exporte les méthodes du cycle de vie :

```javascript
class MonScript {
    // Propriétés configurables (optionnel)
    properties = {
        vitesse: 100,
        couleur: "#ff0000"
    };

    // Appelé au démarrage
    onStart(gameObject, api) {
        api.log('Script démarré!');
    }

    // Appelé à chaque frame
    onUpdate(gameObject, deltaTime, api) {
        // Logique de jeu ici
    }

    // Appelé à la destruction
    onDestroy(gameObject, api) {
        // Nettoyage ici
    }
}

module.exports = MonScript;
```

### 2. Attacher le script à un objet

1. Sélectionnez votre objet dans la hiérarchie
2. Dans le panneau des propriétés, cherchez la propriété "Script"
3. Cliquez sur le sélecteur de fichier
4. Choisissez votre fichier `.js`

Le script sera automatiquement exécuté quand la scène démarre.

## API de Scripting

L'objet `api` fourni aux méthodes du script donne accès aux systèmes du jeu :

### Systèmes disponibles

```javascript
// Input clavier
if (api.input.runtime.isKeyPressed(api.input, 'Space')) {
    api.log('Espace pressé!');
}

// Souris
const mousePos = api.mouse.runtime.getMousePosition(api.mouse);

// Temps
const deltaTime = api.time.runtime.getDeltaTime(api.time);
const totalTime = api.time.runtime.getTotalTime(api.time);

// Audio
// api.audio (si disponible)
```

### Gestion des GameObjects

```javascript
// Trouver un objet par nom
const player = api.findGameObject('Player');

// Trouver des objets par tag (si implémenté)
const enemies = api.findGameObjectsWithTag('enemy');

// Détruire un objet
api.destroy(gameObject);

// Accéder aux propriétés
const x = api.getProperty('x');
api.setProperty('x', 100);
```

### Utilitaires

```javascript
// Logs
api.log('Message de debug');
api.warn('Avertissement');
api.error('Erreur');

// Accès au contexte canvas pour dessins personnalisés
const ctx = api.getContext();
```

## Méthodes du cycle de vie

### onStart(gameObject, api)

Appelé une fois au démarrage de la scène. Utilisez-le pour l'initialisation.

**Paramètres:**
- `gameObject`: L'objet auquel le script est attaché
- `api`: L'API de scripting

### onUpdate(gameObject, deltaTime, api)

Appelé à chaque frame. Utilisez-le pour la logique de jeu et les animations.

**Paramètres:**
- `gameObject`: L'objet auquel le script est attaché
- `deltaTime`: Temps écoulé depuis la dernière frame (en millisecondes)
- `api`: L'API de scripting

### onDestroy(gameObject, api)

Appelé quand l'objet est détruit. Utilisez-le pour nettoyer les ressources.

**Paramètres:**
- `gameObject`: L'objet auquel le script est attaché
- `api`: L'API de scripting

## Événements personnalisés

Vous pouvez définir des méthodes additionnelles qui seront appelées par le système :

```javascript
class MonScript {
    onClick(gameObject, api) {
        api.log('Objet cliqué!');
    }

    onCollision(gameObject, other, api) {
        api.log('Collision avec:', other.name);
    }
}
```

## Propriétés GameObject

Vous pouvez accéder et modifier les propriétés de l'objet directement :

```javascript
onUpdate(gameObject, deltaTime, api) {
    // Position
    gameObject.properties.x += 10;
    gameObject.properties.y += 5;

    // Rotation
    gameObject.properties.angle += 1;

    // Taille
    gameObject.properties.width = 100;
    gameObject.properties.height = 50;

    // Visibilité
    gameObject.isVisible = true;
    gameObject.isActive = true;

    // Propriétés spécifiques à l'extension
    // Pour com.ajs.button:
    gameObject.properties.text = 'Nouveau texte';
    gameObject.properties.bkgColor = '#ff0000';
}
```

## Exemples de scripts

Consultez les fichiers d'exemple dans ce dossier :

- **ExampleScript.js**: Script complet avec de nombreux exemples commentés
- **PlayerMovement.js**: Déplacement simple avec les touches du clavier
- **Rotator.js**: Rotation automatique d'un objet

## Bonnes pratiques

1. **Performance**: Évitez les calculs lourds dans `onUpdate()` qui est appelé à chaque frame
2. **État**: Utilisez `this.` pour stocker l'état entre les frames
3. **Vérifications**: Toujours vérifier si les systèmes sont disponibles (`if (api.input) ...`)
4. **Nettoyage**: Libérez les ressources dans `onDestroy()`
5. **Logs**: Utilisez `api.log()` pour le débogage

## Limitations actuelles

- L'instanciation dynamique d'objets n'est pas encore implémentée
- Le système de tags n'est pas encore implémenté
- Les collisions doivent être gérées manuellement

## Support

Pour plus d'informations sur les extensions et leurs propriétés, consultez la documentation du moteur ou examinez les fichiers `data.json` des extensions dans le dossier `extensions/`.
