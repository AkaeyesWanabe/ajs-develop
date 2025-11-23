# 🗺️ AJS Develop - Roadmap 2025-2026

**Vision :** Créer l'IDE de développement de jeux 2D le plus accessible et puissant, combinant la simplicité d'un éditeur visuel avec la flexibilité du code.

---

## 📅 Version 1.1 - Stabilité & Fondations (✅ EN COURS)
**Timeline :** Octobre 2025
**Focus :** Corriger les problèmes critiques et implémenter les bases manquantes

### Complété ✅
- [x] Corrections sécurité critiques (eval, XSS, path injection)
- [x] Error handling complet sur opérations I/O
- [x] Memory leaks corrigés (event listeners)
- [x] Player/Runtime fonctionnel avec game loop
- [x] Console debug avec filtrage et export
- [x] Script Editor avec Save/Auto-save
- [x] Find & Replace dans Script Editor
- [x] Raccourcis clavier (Ctrl+S, F5, Escape)
- [x] Grid & Snap-to-grid dans Scene Editor
- [x] Multi-selection (Rectangle selection avec containment)
- [x] Transform controls (bounding box, resize handles, rotation)
- [x] Script Editor Pro (multi-cursor, folding, snippets, formatting)

### En Cours 🔄
- [ ] Tests complets de stabilité
- [ ] Documentation utilisateur basique
- [ ] Correction bugs découverts lors des tests

---

## 📅 Version 1.2 - UX Polish (Novembre-Décembre 2025)
**Timeline :** 6-8 semaines
**Focus :** Améliorer l'expérience utilisateur et la productivité

### Objectifs Principaux
- [x] **Multi-selection** (Shift+Click, Rectangle selection) ✅
- [x] **Grid & Snap-to-grid** dans Scene Editor ✅
- [ ] **Undo/Redo System** pour Scene Editor (Command Pattern)
- [ ] **Copy/Paste** objets (Ctrl+C/V)
- [ ] **Loading States** (spinners, progress bars)
- [ ] **Confirmations** pour actions destructives
- [ ] **Tooltips** sur tous les boutons
- [ ] **Rulers** avec mesures

### Améliorations UI
- [ ] Transitions CSS fluides
- [ ] Meilleurs contrastes (WCAG AA)
- [ ] Splitters redimensionnables
- [ ] Tabs avec close buttons améliorés
- [ ] Theme switcher (Dark/Light)

### Accessibilité
- [ ] ARIA labels complets
- [ ] Navigation clavier complète
- [ ] Focus indicators visibles
- [ ] Keyboard shortcuts overlay (Ctrl+?)

---

## 📅 Version 1.5 - Productivity Boost (Janvier-Mars 2026)
**Timeline :** 10-12 semaines
**Focus :** Outils avancés pour développeurs

### Asset Management
- [ ] **Asset Browser** amélioré
  - Thumbnails preview pour images
  - Drag & drop depuis l'explorateur
  - Bulk import
  - Asset tags & filters
  - Unused assets detection
  - Asset compression tools

### Scene Editor Avancé
- [ ] **Transform Tools** (Gizmos 3D)
  - Move tool (W)
  - Rotate tool (E)
  - Scale tool (R)
- [ ] **Align & Distribute** tools
- [ ] **Object Grouping** (Ctrl+G/Ctrl+Shift+G)
- [ ] **Layers Panel** avancé
  - Réorganisation par drag & drop
  - Visibilité par layer
  - Lock/Unlock layers
- [ ] **Object Lock/Unlock**

### Prefab System
- [ ] Create prefab from selection
- [ ] Prefab browser avec preview
- [ ] Instance vs Override mode
- [ ] Apply/Revert changes
- [ ] Nested prefabs support

### Script Editor Pro ✅ COMPLÉTÉ
**Migration réussie vers Monaco Editor (VS Code editor)**

- [x] Multi-cursor editing (Ctrl+Alt+Up/Down, Ctrl+D, Ctrl+Shift+L)
- [x] Code folding (avec fold widgets toujours visibles)
- [x] **Minimap** (activée avec slider au survol)
- [x] **Bracket pair colorization** (colorisation native des paires de brackets)
- [x] Code formatting (ALT+Shift+S - js-beautify + Monaco formatter)
- [x] Snippets customisables (15+ snippets JS: log, fn, af, for, foreach, if, ife, try, class, exports, req, promise, async, timeout, interval)
- [x] IntelliSense avancé (suggestions rapides, autocompletion intelligente)
- [x] Bracket matching (mise en évidence des paires)
- [x] Format on paste/type
- [x] Smooth scrolling & cursor animation
- [x] Support multi-langages (JS, JSON, HTML, CSS, Markdown)
- [x] Find & Replace intégré
- [x] Thème personnalisé 'ajs-dark'

**Nouveautés Monaco:**
- Autocompletion contextuelle avancée
- Suggestions de code intelligentes
- Validation syntaxique en temps réel
- Refactoring hints
- Performance optimale même sur gros fichiers

---

## 📅 Version 2.0 - Professional Edition (Avril-Juin 2026)
**Timeline :** 12-14 semaines
**Focus :** Features de niveau professionnel

### Testing & Debugging
- [ ] **Breakpoints** dans Script Editor
- [ ] **Debug Mode** avec pause/step
- [ ] **Variable Inspector** (watch panel)
- [ ] **Call Stack** viewer
- [ ] **Performance Profiler**
  - CPU usage graph
  - Memory usage graph
  - FPS history
  - Object count tracking
- [ ] **Memory Analyzer**
  - Heap snapshots
  - Memory leak detection

### Animation System Pro
- [ ] **Timeline** avancée avec scrubbing
- [ ] **Tweening/Easing** entre frames
- [ ] **Onion Skinning** (affiche frames adjacents)
- [ ] **Frame Blending**
- [ ] **Auto-trace** collision polygons (image → polygon)
- [ ] **Bone-based Animation** (skeleton/IK)
- [ ] **Animation Events** (trigger code à frame spécifique)

### Build & Export Pro
- [ ] **HTML5/WebGL** export optimisé
- [ ] **Mobile Export** (Cordova/Capacitor)
  - Android APK
  - iOS IPA
  - Configuration signing
- [ ] **Desktop Export** (Electron option)
- [ ] **Optimization Profiles**
  - Development (non-minified)
  - Production (minified + obfuscated)
  - Custom profiles
- [ ] **Asset Atlas** auto-generation
- [ ] **Code Obfuscation**
- [ ] **Analytics Integration** (optional)

### Plugin System
- [ ] **Extension API** complète documentée
- [ ] **Extension Marketplace**
  - Discovery panel
  - One-click install
  - Auto-updates
  - Version compatibility
- [ ] **Extension Settings UI**
- [ ] **Extension Dev Tools**
  - Extension generator CLI
  - Hot reload extensions
  - Extension debugger

---

## 📅 Version 2.5 - Collaboration (Juillet-Septembre 2026)
**Timeline :** 12 semaines
**Focus :** Travail d'équipe et collaboration

### Git Integration
- [ ] **Git Commands** depuis IDE
  - Commit (Ctrl+K)
  - Pull/Push
  - Branch switcher
  - Merge
- [ ] **Conflict Resolution UI**
  - Visual diff viewer
  - Side-by-side comparison
  - 3-way merge
- [ ] **Scene Merge Tools**
  - Object-level diff
  - Accept theirs/ours/both
- [ ] **Blame/History** viewer
- [ ] **Comment System** sur objets
  - Threads de discussion
  - @mentions
  - Resolve/Unresolve

### Team Features
- [ ] **Project Templates** partagés
- [ ] **Asset Library** cloud (optional)
- [ ] **User Roles** (Owner, Developer, Designer, Viewer)
- [ ] **Activity Log** (qui a modifié quoi)

### Cloud Integration (Optional)
- [ ] Cloud project storage
- [ ] Auto-sync
- [ ] Backup/Restore
- [ ] Version history

---

## 📅 Version 3.0 - Next Generation (Octobre 2026-Mars 2027)
**Timeline :** 24 semaines
**Focus :** Innovation et fonctionnalités avancées

### Visual Scripting
- [ ] **Node-based Editor** (type Blueprint Unreal Engine)
  - Event nodes (onCreated, onUpdate, etc.)
  - Action nodes (move, rotate, play sound)
  - Logic nodes (if, switch, loop)
  - Math nodes
  - Variable nodes
  - Function nodes
- [ ] **Export to JavaScript** code
- [ ] **Hybrid Mode** (visual + code côte à côte)
- [ ] **Custom Nodes** API
- [ ] **Node Library** avec recherche

### Advanced Systems
- [ ] **Particle System Editor**
  - Visual emitter editor
  - Preview in real-time
  - Preset library (fire, smoke, explosion)
  - Custom textures
  - Curve editors (size, alpha, velocity)

- [ ] **Physics Editor**
  - Physics shapes (box, circle, polygon)
  - Joint configurator (distance, revolute, prismatic)
  - Collision matrix
  - Physics debug draw
  - Material properties (friction, restitution)

- [ ] **Audio System**
  - Audio mixer (multiple tracks)
  - Volume/Pan/Pitch controls
  - Audio effects (reverb, delay, EQ)
  - Spatial audio 3D
  - Audio visualization

- [ ] **Tilemap Editor**
  - Tile palette
  - Brush tools
  - Auto-tiling
  - Multiple layers
  - Collision layer
  - Import from Tiled

### AI-Assisted Development
- [ ] **Code Completion** intelligent (AI-powered)
- [ ] **Bug Detection** automatique
- [ ] **Performance Suggestions**
- [ ] **Asset Optimization** suggestions
- [ ] **Natural Language** → Code generation

### 2.5D / Limited 3D Support
- [ ] Sprite stacking pour pseudo-3D
- [ ] Parallax scrolling avancé
- [ ] Z-ordering automatique
- [ ] Perspective camera
- [ ] 3D transform preview

---

## 📅 Beyond 3.0 - Future Vision

### Mobile-First Development
- [ ] Touch controls editor
- [ ] Device simulation
- [ ] Gyroscope/Accelerometer testing
- [ ] Performance profiling mobile

### Multiplayer/Networking
- [ ] Multiplayer template
- [ ] Network replication editor
- [ ] Server/Client architecture
- [ ] Matchmaking integration
- [ ] Lobby system

### Monetization Tools
- [ ] Ads integration (AdMob, Unity Ads)
- [ ] In-App Purchases editor
- [ ] Analytics dashboard
- [ ] A/B testing tools

### Education Mode
- [ ] Tutorials interactifs
- [ ] Step-by-step guides
- [ ] Example projects library
- [ ] Challenges & Achievements
- [ ] Learning paths

### Community Platform
- [ ] Game showcase
- [ ] Template marketplace
- [ ] Asset store
- [ ] Forums
- [ ] Live streaming integration

---

## 🎯 Priorités par Catégorie

### 🔥 CRITICAL (Must Have)
1. Undo/Redo
2. Copy/Paste
3. Loading states
4. Error handling complet
5. Git integration basique

### ⚡ HIGH (Should Have)
1. Grid & Snap
2. Transform tools
3. Prefab system
4. Asset browser amélioré
5. Visual scripting

### 💡 MEDIUM (Nice to Have)
1. Particle system
2. Physics editor
3. Tilemap editor
4. Advanced animation
5. Cloud sync

### 🌟 LOW (Future)
1. AI features
2. 3D support
3. Multiplayer
4. Monetization
5. Mobile profiling

---

## 📊 Métriques de Succès

### Version 1.2 Target
- 0 bugs critiques
- < 5 bugs moyens
- 100% features de base fonctionnelles
- Documentation complète
- 10+ utilisateurs beta testeurs

### Version 2.0 Target
- 50+ extensions community
- 100+ projets créés
- < 2s temps de build
- 60 FPS stable en runtime
- 1000+ utilisateurs

### Version 3.0 Target
- 200+ extensions
- 1000+ projets
- Marketplace actif
- 10,000+ utilisateurs
- Communauté active

---

## 🤝 Comment Contribuer

### Pour Développeurs
1. Consulter [IMPROVEMENTS.md](IMPROVEMENTS.md) pour l'état actuel
2. Choisir une feature de la roadmap
3. Créer une issue GitHub
4. Fork + Pull Request

### Pour Designers
1. Proposer des améliorations UI/UX
2. Créer des mockups
3. Tester l'accessibilité

### Pour Testeurs
1. Reporter les bugs
2. Suggérer des améliorations
3. Créer des projets d'exemple

### Pour Créateurs de Contenu
1. Créer des extensions
2. Partager des templates
3. Écrire des tutoriels

---

## 📞 Contact & Support

- **Issues :** GitHub Issues
- **Discussions :** GitHub Discussions
- **Email :** [contact à définir]
- **Discord :** [serveur à créer]

---

**Dernière mise à jour :** 25 Octobre 2025
**Prochaine révision :** Décembre 2025
