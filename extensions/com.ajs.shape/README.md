# Shape Extension (com.ajs.shape)

Extension pour dessiner des formes géométriques avec support des couleurs unies et des dégradés.

## Fonctionnalités

### Types de formes
- **Rectangle** - Rectangle avec coins arrondis optionnels
- **Circle** - Cercle parfait
- **Ellipse** - Ellipse configurable
- **Triangle** - Triangle équilatéral
- **Polygon** - Polygone régulier (3-20 côtés)
- **Star** - Étoile avec rayon intérieur configurable

### Types de remplissage
- **None** - Pas de remplissage (forme vide)
- **Solid Color** - Couleur unie
- **Linear Gradient** - Dégradé linéaire avec angle configurable
- **Radial Gradient** - Dégradé radial du centre vers l'extérieur

### Propriétés

#### Forme
- `shapeType` - Type de forme à dessiner
- `width` - Largeur de la forme
- `height` - Hauteur de la forme
- `cornerRadius` - Rayon des coins (rectangle uniquement)
- `sides` - Nombre de côtés (polygone/étoile)
- `innerRadius` - Rayon intérieur (étoile uniquement, 0.1-1.0)

#### Remplissage
- `fillType` - Type de remplissage (none/solid/linear/radial)
- `fillColor` - Couleur principale
- `fillColor2` - Couleur secondaire (dégradés)
- `gradientAngle` - Angle du dégradé linéaire (0-360°)

#### Bordure
- `strokeEnabled` - Activer la bordure
- `strokeColor` - Couleur de la bordure
- `strokeWidth` - Épaisseur de la bordure

#### Apparence
- `opacity` - Opacité (0-1)

## Exemples d'utilisation

### Rectangle avec dégradé linéaire
```javascript
{
  shapeType: "rectangle",
  width: 200,
  height: 100,
  fillType: "linear",
  fillColor: "#5ECDDE",
  fillColor2: "#FF6B9D",
  gradientAngle: 45,
  cornerRadius: 10
}
```

### Étoile avec dégradé radial
```javascript
{
  shapeType: "star",
  width: 150,
  height: 150,
  fillType: "radial",
  fillColor: "#FFD93D",
  fillColor2: "#FF6B9D",
  sides: 5,
  innerRadius: 0.5,
  strokeEnabled: true,
  strokeColor: "#000000",
  strokeWidth: 2
}
```

### Hexagone avec couleur unie
```javascript
{
  shapeType: "polygon",
  width: 120,
  height: 120,
  fillType: "solid",
  fillColor: "#6BCF7F",
  sides: 6,
  opacity: 0.8
}
```

## Utilisation dans les scripts

Les formes peuvent être manipulées via scripts comme tout autre objet :

```javascript
// Changer la couleur
gameObject.properties.fillColor = "#FF0000";

// Animer la rotation
gameObject.properties.angle += 1;

// Changer de forme dynamiquement
gameObject.properties.shapeType = "star";

// Animer l'opacité
gameObject.properties.opacity = Math.sin(Date.now() / 1000) * 0.5 + 0.5;
```

## Notes techniques

- Les dégradés sont recalculés à chaque frame
- Les formes utilisent le système de coordonnées canvas HTML5
- Les transformations (rotation, scale) sont appliquées correctement
- Performance optimale même avec beaucoup de formes
