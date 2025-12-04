# Scripts d'Animation

Ce dossier contient des scripts pour contrôler les animations des sprites dans votre jeu.

## AnimationController.js

**Contrôleur automatique d'animations basé sur le mouvement**

### Description
Ce script change automatiquement l'animation d'un sprite en fonction de son mouvement. Il détecte la vitesse de l'objet et bascule entre les animations idle, walk et run.

### Prérequis
- L'objet doit être un **sprite** (extension `com.ajs.sprite`)
- Le sprite doit avoir un fichier `.anim` chargé avec des animations

### Propriétés configurables

| Propriété | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `idleAnimation` | string | "idle" | Nom de l'animation quand l'objet ne bouge pas |
| `walkAnimation` | string | "walk" | Nom de l'animation quand l'objet marche |
| `runAnimation` | string | "run" | Nom de l'animation quand l'objet court |
| `jumpAnimation` | string | "jump" | Nom de l'animation de saut |
| `fallAnimation` | string | "fall" | Nom de l'animation de chute |
| `useRunKey` | boolean | false | Si true, utilise Shift pour courir |
| `autoDetectMovement` | boolean | true | Détecte automatiquement le mouvement |
| `movementThreshold` | number | 0.1 | Seuil de vitesse pour détecter le mouvement |

### Utilisation

1. Attachez le script `AnimationController.js` à votre sprite
2. Configurez les noms des animations dans les propriétés
3. Le script détectera automatiquement le mouvement et changera l'animation

### Exemple
```javascript
// Les propriétés dans l'éditeur:
{
    "idleAnimation": "player_idle",
    "walkAnimation": "player_walk",
    "runAnimation": "player_run",
    "useRunKey": true,
    "movementThreshold": 5
}
```

### Méthodes publiques

#### `setState(state)`
Force un changement d'état manuel.
```javascript
// Depuis un autre script:
const animController = gameObject.getScript('AnimationController');
if (animController) {
    animController.setState('jump');
}
```

#### `playAnimation(gameObject, animationName)`
Joue une animation spécifique.
```javascript
animController.playAnimation(gameObject, 'special_attack');
```

---

## AnimationSwitcher.js

**Changeur manuel d'animations avec les touches du clavier**

### Description
Ce script permet de changer manuellement l'animation d'un sprite en appuyant sur les touches numériques (1-6).

### Prérequis
- L'objet doit être un **sprite** (extension `com.ajs.sprite`)
- Le sprite doit avoir un fichier `.anim` chargé avec des animations
- Le système d'input clavier doit être activé

### Propriétés configurables

| Propriété | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `animation1` | string | "idle" | Animation pour la touche 1 |
| `animation2` | string | "walk" | Animation pour la touche 2 |
| `animation3` | string | "run" | Animation pour la touche 3 |
| `animation4` | string | "jump" | Animation pour la touche 4 |
| `animation5` | string | "" | Animation pour la touche 5 (optionnel) |
| `animation6` | string | "" | Animation pour la touche 6 (optionnel) |
| `useNumKeys` | boolean | true | Active les touches numériques |
| `currentAnimation` | string | "idle" | Animation par défaut au démarrage |

### Utilisation

1. Attachez le script `AnimationSwitcher.js` à votre sprite
2. Configurez les noms des animations pour chaque touche
3. En jeu, appuyez sur les touches 1-6 pour changer d'animation

### Contrôles
- **Touche 1** : Jouer animation1
- **Touche 2** : Jouer animation2
- **Touche 3** : Jouer animation3
- **Touche 4** : Jouer animation4
- **Touche 5** : Jouer animation5 (si défini)
- **Touche 6** : Jouer animation6 (si défini)

### Exemple
```javascript
// Les propriétés dans l'éditeur:
{
    "animation1": "idle",
    "animation2": "walk",
    "animation3": "attack",
    "animation4": "defend",
    "animation5": "victory",
    "currentAnimation": "idle"
}
```

### Méthodes publiques

#### `switchToAnimation(gameObject, animationName, api)`
Change vers une animation spécifique.
```javascript
switcher.switchToAnimation(gameObject, 'special', api);
```

#### `getCurrentAnimation()`
Retourne le nom de l'animation actuelle.
```javascript
const current = switcher.getCurrentAnimation();
console.log(current); // "walk"
```

#### `listAnimations(api)`
Affiche la liste de toutes les animations disponibles dans la console.
```javascript
switcher.listAnimations(api);
// Output:
// Available animations:
//   1. idle
//   2. walk
//   3. run
```

---

## Système d'Animation

### Comment créer un fichier .anim

Les fichiers `.anim` contiennent les définitions d'animations pour vos sprites. Ils sont généralement créés avec l'éditeur d'animations intégré.

Structure de base:
```json
{
    "animations": [
        {
            "name": "idle",
            "frameRate": 10,
            "loop": true,
            "startLoopFrame": 0,
            "frames": [
                {
                    "path": "assets/sprites/player/idle_001.png",
                    "width": 64,
                    "height": 64,
                    "points": [
                        { "name": "origin", "x": 32, "y": 32 }
                    ]
                }
            ]
        }
    ]
}
```

### API Sprite Runtime

Les scripts peuvent accéder aux méthodes suivantes via `api.getExtension('com.ajs.sprite')`:

- `setAnimation(gameObject, animationName, restart)` - Changer d'animation
- `play(gameObject)` - Jouer l'animation
- `pause(gameObject)` - Mettre en pause
- `stop(gameObject)` - Arrêter et réinitialiser
- `getAnimationNames(gameObject)` - Obtenir la liste des animations
- `isPlaying(gameObject)` - Vérifier si l'animation joue
- `gotoFrame(gameObject, frameIndex)` - Aller à une frame spécifique
- `getPoint(gameObject, pointName)` - Obtenir un point de la frame courante
- `getCollider(gameObject)` - Obtenir le collider de la frame courante

---

## Dépannage

### L'animation ne change pas
1. Vérifiez que les noms d'animations correspondent exactement à ceux du fichier `.anim`
2. Ouvrez la console pour voir les messages d'erreur
3. Vérifiez que le fichier `.anim` est bien chargé dans les propriétés du sprite

### Le script ne fonctionne pas
1. Vérifiez que l'objet est bien un sprite (extension `com.ajs.sprite`)
2. Vérifiez que le sprite a un fichier `.anim` assigné
3. Consultez la console pour les messages d'erreur ou d'avertissement

### Les touches ne répondent pas (AnimationSwitcher)
1. Vérifiez que le système d'input clavier est activé dans votre projet
2. Vérifiez que `useNumKeys` est à `true`
3. Essayez les touches avec et sans le pavé numérique

---

## Exemples d'utilisation

### Exemple 1 : Personnage avec mouvement automatique
Utilisez `AnimationController` avec `PlayerMovement`:

```javascript
// Objet "Player" avec deux scripts:
// 1. PlayerMovement.js - Gère le déplacement
// 2. AnimationController.js - Gère les animations

// Configuration AnimationController:
{
    "idleAnimation": "player_idle",
    "walkAnimation": "player_walk",
    "autoDetectMovement": true,
    "movementThreshold": 5
}
```

### Exemple 2 : Test d'animations
Utilisez `AnimationSwitcher` pour tester vos animations:

```javascript
// Objet "AnimationTest" avec un script:
// AnimationSwitcher.js

// Appuyez sur 1, 2, 3, 4 pour voir les différentes animations
```

### Exemple 3 : Combiner les deux scripts
Vous pouvez même combiner les deux pour plus de contrôle:

```javascript
// Objet avec trois scripts:
// 1. PlayerMovement.js
// 2. AnimationController.js (pour les animations normales)
// 3. AnimationSwitcher.js (pour les animations spéciales)

// AnimationController gère idle/walk automatiquement
// AnimationSwitcher permet de déclencher des attaques avec 1, 2, 3...
```

---

## Notes importantes

1. **Performance** : L'AnimationController calcule la vitesse à chaque frame. Pour de meilleures performances sur des objets statiques, utilisez `autoDetectMovement: false`.

2. **Compatibilité** : Ces scripts fonctionnent avec le système d'animation existant et ne nécessitent aucune modification du moteur.

3. **Extensibilité** : Vous pouvez hériter de ces classes pour créer vos propres contrôleurs d'animation personnalisés.

4. **Robustesse** : Les scripts vérifient automatiquement que toutes les fonctionnalités nécessaires sont disponibles avant de s'exécuter.
