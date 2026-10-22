# 8 GATES 3D minigames: where every file lives

Repo: **BlindbenFILMS/3D-foxgate8** (GitHub Pages: https://blindbenfilms.github.io/3D-foxgate8/). Paths are from the repo root.

- `3D-GAMES/index.html` is the Game Room menu.
- `3D-GAMES/<Name>.dc.html` pages share `3D-GAMES/engine/`, `3D-GAMES/minigames/`, `3D-GAMES/fox-kit.js` and `3D-GAMES/vendor/`.
- `3D-GAMES/g/<folder>/` games are self-contained (own engine/, vendor/, support.js). Their game code is in that folder's `minigames/`, or `blob/*.js` / `*.bundle.js` for bundled ones.
- Online play everywhere goes through `engine/duel-net.js` + `vendor/trystero-nostr.js`.
- Vehicles all live in `3D-GAMES/Vehicle Workshop.dc.html` (models in `3D-GAMES/engine/vehicle-kit.js` and `engine/vehicle-fun.js`); `?v=<key>` opens one.

## Arcade & Carnival

- **Ring Toss** (Carnival): `3D-GAMES/g/fox-ring-toss/Main.dc.html`
- **Water-Gun Horse Race** (Carnival): `3D-GAMES/g/water-gun-horse-race-462b3a/Main.dc.html`
- **Balloon Pop** (Carnival): `3D-GAMES/g/carnival-balloon-pop-126f9d/game.html`
- **Coconut Shy** (Carnival): `3D-GAMES/Carnival Coconut Shy.dc.html`
- **Shooting Gallery + Marsh Blaster** (Carnival): `3D-GAMES/g/8-gates-minigames/Main.dc.html`
- **Marsh Blaster** (Arcade): `3D-GAMES/g/marsh-blaster/index.html`
- **Dusty Gulch** (Saloon): `3D-GAMES/g/dusty-gulch/index.html`
- **Fox Blaster** (Arcade): `3D-GAMES/g/fox-blaster/Main.dc.html`
- **Claw Crane** (Arcade): `3D-GAMES/Arcade Claw Crane.dc.html`
- **Love Tester** (Arcade): `3D-GAMES/g/8-gates-love-tester/love-tester.html`
- **Dance Machine + Shuffleboard** (Arcade): `3D-GAMES/g/fox-arcade/index.html`
- **Skee-Ball** (Arcade): `3D-GAMES/g/skee-ball-phone-preview/Main.dc.html`
- **Gate Rush Pinball + Lucky Gates Slots** (Arcade): Pinball: `3D-GAMES/g/8-gates-arcade/pinball.dc.html` · Slots: `3D-GAMES/g/8-gates-arcade/slots.dc.html`
- **Snack Stop Vending Machine** (Any world): `3D-GAMES/Arcade Vending Machine.dc.html`
- **Fox Gate Pachinko** (Arcade): `3D-GAMES/g/fox-gate-pachinko/Main.dc.html`
- **Arcade Coin Pusher** (Arcade): `3D-GAMES/Arcade Coin Pusher.dc.html`
- **Capsule Corner** (Any world): `3D-GAMES/Capsule Corner.dc.html`
- **Dunk Tank** (Meru): `3D-GAMES/Meru Dunk Tank.dc.html`
- **Bumper Cars** (Carnival): `3D-GAMES/g/bumper-cars/BumperCars.dc.html`
- **Juggling** (Town stage): `3D-GAMES/g/juggling/Juggling.dc.html`
- **Funhouse Dash** (Carnival): `3D-GAMES/g/funhouse-dash/Main.dc.html`

## Tavern Games

- **Pool, Air Hockey, Ping-Pong, Foosball** (Tavern): Pool: `3D-GAMES/g/tavern-games/Main.dc.html` · Air Hockey: `3D-GAMES/g/tavern-games/HockeyMain.dc.html` · Ping-Pong: `3D-GAMES/g/tavern-games/PongMain.dc.html` · Foosball: `3D-GAMES/g/tavern-games/FoosMain.dc.html`
- **Axe House, Cornhole, Washers** (Tavern): Axe: `3D-GAMES/g/8-gates-minigames-phone-preview/Main.dc.html` · Cornhole: `3D-GAMES/g/8-gates-minigames-phone-preview/Cornhole.dc.html` · Washers: `3D-GAMES/g/8-gates-minigames-phone-preview/Washers.dc.html`
- **Whack-a-Mole** (Tavern): `3D-GAMES/g/tavern-whack-a-mole/Main.dc.html`
- **Fox Hoops** (Zion): `3D-GAMES/g/fox-hoops-a28312/index.html`
- **Liar's Dice** (Tavern): `3D-GAMES/g/liars-dice/liars-dice.dc.html`
- **Cribbage** (Tavern): `3D-GAMES/g/cribbage/cribbage.dc.html`
- **Shut the Box** (Tavern): `3D-GAMES/g/shut-the-box/shut-the-box.dc.html`
- **Shuffleboard** (Any world): `3D-GAMES/Shuffleboard.dc.html`

## Sports & Strength

- **Arm Wrestling** (Meru): `3D-GAMES/g/arm-wrestling-iron-table/Main.dc.html`
- **Fox Fighters** (Meru · Pearl Sail): `FOXFIGHTERS-FINAL/FoxFighters/Pearl Roof Duel.html`
- **Tug of War** (Hall): `3D-GAMES/Tug of War.dc.html`
- **Tetherball** (Gym hall): `3D-GAMES/g/tetherball-hall/Main.dc.html`
- **Curling** (Home): `3D-GAMES/g/curling-club/Main.dc.html`
- **Mini Golf** (Home): `3D-GAMES/g/fox-mini-golf/Main.dc.html`
- **Mechanical Bull** (Zion): `3D-GAMES/g/zion-mechanical-bull/Main.dc.html`
- **Cricket Nets** (Any world): `3D-GAMES/Cricket Nets.dc.html`
- **The Gaya Open** (Gaya): `3D-GAMES/Gaya Tennis.dc.html`
- **The Cistern Cup** (Kufa): `3D-GAMES/Kufa Soccer.dc.html`
- **The Iron Cup** (Home): `3D-GAMES/Home Hockey.dc.html`
- **Sumo Streak** (Kyoto): `3D-GAMES/Kyoto Sumo Hall.dc.html`
- **Sword Duel** (Kyoto): `3D-GAMES/Kyoto Sword Duel.dc.html`
- **Foxy Boxing** (Luxor): `3D-GAMES/Luxor Boxing.dc.html`
- **Archery** (Town): `3D-GAMES/g/8-gates-archery/Archery.dc.html`
- **Croquet** (Garden): `3D-GAMES/g/8-gates-croquet/Croquet.dc.html`
- **Volleyball** (Beach): `3D-GAMES/g/volleyball/Volleyball.dc.html`
- **Basketball** (Arena): `3D-GAMES/g/basketball/Main.dc.html`
- **Track and Field** (Stadium): `3D-GAMES/g/track-and-field/TrackField.dc.html`
- **Playground** (Town): `3D-GAMES/g/playground/Playground.dc.html`
- **Dodgeball** (Gym): `3D-GAMES/g/dodgeball/Dodgeball.dc.html`
- **Fox Baseball** (Ballpark): `3D-GAMES/g/fox-baseball/Main.dc.html`
- **Frisbee** (Town field): `3D-GAMES/g/frisbee/Frisbee.dc.html`

## Water, Rides & Action

- **Surf Contest** (Jidda): Play: `3D-GAMES/Jidda Surf.dc.html` · Old version: `(other repo FOXgate8) 3D/minigames3d/surf.html`
- **Swim Trials** (Jidda): `3D-GAMES/Jidda Swim.dc.html`
- **Deep Dive** (Jidda): `3D-GAMES/Jidda Deep Dive.dc.html`
- **Pearl Dive** (Meru): `3D-GAMES/Meru Pearl Dive.dc.html`
- **Submarine** (Jidda): `3D-GAMES/Jidda Submarine.dc.html`
- **Jetski Run** (Jidda): `3D-GAMES/Jidda Jetski.dc.html`
- **Inner Tube Run** (Jidda): `3D-GAMES/Jidda Inner Tube.dc.html`
- **Speedboat Bay** (Meru): `3D-GAMES/Speedboat Bay.dc.html`
- **Skate Park** (Meru): `3D-GAMES/Skate Park.dc.html`
- **Nebo Bike Park** (Nebo): `3D-GAMES/Nebo Bike Park.dc.html`
- **Moto School + Volcano Run** (Luxor): `3D-GAMES/Luxor Moto.dc.html`
- **Foxtruck Crush** (Zion): Play: `3D-GAMES/Zion Monster Arena.dc.html` · Old version: `(other repo FOXgate8) 3D/minigames3d/trucks.html`
- **Tank Range** (Meru): `3D-GAMES/Tank Range.dc.html`

## Meru Casino

- **Meru Poker + Treasure Wheel** (Meru): Treasure Wheel: `3D-GAMES/g/meru-poker/Wheel.dc.html` · Poker: `3D-GAMES/g/meru-poker/Main.dc.html`
- **Five Card Stud** (Meru): Play: `3D-GAMES/Meru Five Card Stud.dc.html` · Card Workshop: `3D-GAMES/Meru Stud Card Workshop.dc.html`
- **Texas Hold'em** (Meru): `3D-GAMES/Meru Texas Holdem.dc.html`

## Board Game Clubs

- **Chess Club** (Home): `3D-GAMES/g/chess-club/chess-club.dc.html`
- **Checkers Club** (Home): `3D-GAMES/g/checkers-club/checkers-club.dc.html`
- **Backgammon Club** (Home): `3D-GAMES/g/backgammon-club/backgammon-club.dc.html`
- **Go Club** (Home): `3D-GAMES/g/go-club/go-club.dc.html`
- **Dominoes Club** (Any world): `3D-GAMES/g/dominoes-club/dominoes-club.dc.html`

## Shops & Jobs

- **Bex's Truck Shop** (Zion): `3D-GAMES/g/bex-truck-shop/Main.dc.html`
- **Bram's Ski Works** (Home): `3D-GAMES/g/bram-ski-works/Main.dc.html`
- **Bramble's Comics** (Home): `3D-GAMES/Comic Shop.dc.html`
- **Breakfast All Day Diner** (Earth): `3D-GAMES/g/breakfast-all-day-diner/Phone-Portrait.dc.html`
- **Clubhouse 8 · The Counter** (Home): `3D-GAMES/g/clubhouse-8/Main.dc.html`
- **Ember's Skewer House** (Meru): `3D-GAMES/g/ember-skewer-house/Main.dc.html`
- **Felt's Ball Works** (Gaya): `3D-GAMES/Gaya Ball Factory.dc.html`
- **Fox Cinema** (Any world): `3D-GAMES/Fox Cinema.dc.html`
- **FOX Gelato** (Any world): `3D-GAMES/g/fox-gelato/Main.dc.html`
- **Foxy Cakes** (Any world): `3D-GAMES/g/foxy-cakes/Main.dc.html`
- **Foxy Gyoza** (Any world): `3D-GAMES/g/foxy-gyoza/Foxy Gyoza.dc.html`
- **Foxy Maki** (Kyoto): `3D-GAMES/g/foxy-maki/Main.dc.html`
- **Foxy Pies** (Any world): `3D-GAMES/g/foxy-pies/Main.dc.html`
- **Foxy Ramen** (Any world): `3D-GAMES/g/foxy-ramen/Main.dc.html`
- **Opa's Candle Works** (Gaya): `3D-GAMES/g/gaya-candle-works/Main.dc.html`
- **Goldsmith of Zion** (Zion): `3D-GAMES/g/goldsmith-of-zion/Main.dc.html`
- **Jib's Surf Shop** (Jidda): `3D-GAMES/g/jibs-surf-shop/Main.dc.html`
- **Kufa Creamery** (Kufa): `3D-GAMES/g/kufa-creamery/Main.dc.html`
- **Luxor Bike Shop** (Luxor): `3D-GAMES/g/luxor-bike-shop/Main.dc.html`
- **Hessa's Menagerie** (Luxor): `3D-GAMES/g/luxor-zoo/Main.dc.html`
- **Hope's Class** (Meru): `3D-GAMES/g/meru-school-for-the-blind/Main.dc.html`
- **Nebo Candy Shop** (Nebo): `3D-GAMES/g/nebo-candy-shop/Main.dc.html`
- **Cedar's Lumber Mill** (Nebo): `3D-GAMES/g/nebo-lumber-mill/Main.dc.html`
- **Marlow's Pet Store** (Nebo): `3D-GAMES/g/nebo-pet-store/Main.dc.html`
- **Ocean World Dolphin Trainer** (Jidda): `3D-GAMES/g/ocean-world-aquarium/Main.dc.html`
- **Rafiq's Spy Shop** (Kufa): `3D-GAMES/g/spyshop-of-kufa/Main.dc.html`
- **Tread's Tank Works** (Tank Range): `3D-GAMES/g/treads-tank-works/Main.dc.html`
- **Ummi's Camel Pen** (Kufa): `3D-GAMES/Kufa Camel Pen.dc.html`
- **Meru Burgers** (Meru): `3D-GAMES/Meru Burgers.dc.html`
- **Jon's Boatworks** (Meru): `3D-GAMES/Jon Boatworks.dc.html`
- **Foxy Blends Smoothies** (Jidda): `3D-GAMES/Jidda Smoothie.dc.html`
- **Foxy Deli** (Luxor): `3D-GAMES/Luxor Deli.dc.html`
- **Zion Gold Rush** (Zion): `3D-GAMES/g/gold-rush/Main.dc.html`
- **Ur Espresso** (Ur): `3D-GAMES/g/ur-espresso/Main.dc.html`
- **Ur Laboratory** (Ur): `3D-GAMES/g/ur-lab/Main.dc.html`
- **Ur Pyramid Dig** (Ur): `3D-GAMES/g/ur-dig/Main.dc.html`
- **Ur Grounds** (Ur): `3D-GAMES/g/ur-grounds/Main.dc.html`
- **Airport TSA** (Airport): `3D-GAMES/g/airport-tsa/Main.dc.html`
- **Car Wash** (Town): `3D-GAMES/g/car-wash/Main.dc.html`
- **Woodshop** (Town): `3D-GAMES/g/woodshop/Main.dc.html`
- **Toy Workshop** (Town): `3D-GAMES/g/toy-workshop/Main.dc.html`
- **Washing Up** (Kitchen): `3D-GAMES/g/washing-up/WashingUp.dc.html`
- **Fox Farm** (Farm): `3D-GAMES/g/fox-farm/Main.dc.html`
- **Orchard** (Orchard): `3D-GAMES/g/orchard/Orchard.dc.html`
- **Electrician Job** (Town): `3D-GAMES/g/electrician-job/ElectricianJob.dc.html`

## Stage & Places

- **The Fox Wife** (Kyoto): `3D-GAMES/Kyoto Theatre.dc.html`
- **Hollow Vale** (Village): `3D-GAMES/Hollow Vale.dc.html`

## Already in your repo

- **Kyoto Archery** (Kyoto): `(other repo FOXgate8) 3D/minigames3d/archery.html`
- **Nebo Glider** (Nebo): `(other repo FOXgate8) 3D/minigames3d/glider.html`
- **Gold Panning** (Zion): `(other repo FOXgate8) 3D/minigames3d/gold.html`
- **Speedway** (Earth): `(other repo FOXgate8) 3D/minigames3d/speedway.html`
- **Fishing** (Meru): `(other repo FOXgate8) 3D/minigames3d/fishing.html`

## Vehicles

- **Tank** (Workshop): `3D-GAMES/Vehicle Workshop.dc.html?v=tank`
- **Motorcycle** (Workshop): `3D-GAMES/Vehicle Workshop.dc.html?v=moto`
- **Monster Truck** (Workshop): `3D-GAMES/Vehicle Workshop.dc.html?v=truck`
- **Racecar** (Workshop): `3D-GAMES/Vehicle Workshop.dc.html?v=racecar`
- **Noble's Mech Walker** (Workshop): `3D-GAMES/Vehicle Workshop.dc.html?v=mech`
- **Speedboat** (Workshop): `3D-GAMES/Vehicle Workshop.dc.html?v=boat`
- **Mountain Bike** (Workshop): `3D-GAMES/Vehicle Workshop.dc.html?v=bike`
- **Skateboard** (Workshop): `3D-GAMES/Vehicle Workshop.dc.html?v=skate`
- **Helicopter** (Workshop): `3D-GAMES/Vehicle Workshop.dc.html?v=heli`
- **Jet Ski** (Workshop): `3D-GAMES/Vehicle Workshop.dc.html?v=jetski`
- **Surfboard** (Workshop): `3D-GAMES/Vehicle Workshop.dc.html?v=surf`
- **Parachute** (Workshop): `3D-GAMES/Vehicle Workshop.dc.html?v=chute`
- **Hang Glider** (Workshop): `3D-GAMES/Vehicle Workshop.dc.html?v=glider`
- **Pogo Stick** (Workshop): `3D-GAMES/Vehicle Workshop.dc.html?v=pogo`
- **Space Hopper** (Workshop): `3D-GAMES/Vehicle Workshop.dc.html?v=hopper`
- **Kangaroo Boots** (Workshop): `3D-GAMES/Vehicle Workshop.dc.html?v=kroo`
- **Jetpack** (Workshop): `3D-GAMES/Vehicle Workshop.dc.html?v=jetpack`
- **Hoverboard** (Workshop): `3D-GAMES/Vehicle Workshop.dc.html?v=hover`
- **Unicycle** (Workshop): `3D-GAMES/Vehicle Workshop.dc.html?v=unicycle`
- **Giant Turtle** (Workshop): `3D-GAMES/Vehicle Workshop.dc.html?v=turtle`
- **Ostrich** (Workshop): `3D-GAMES/Vehicle Workshop.dc.html?v=ostrich`
- **Dragon Hatchling** (Workshop): `3D-GAMES/Vehicle Workshop.dc.html?v=dragon`
- **Shopping Cart** (Workshop): `3D-GAMES/Vehicle Workshop.dc.html?v=cart`
- **Hamster Ball** (Workshop): `3D-GAMES/Vehicle Workshop.dc.html?v=hamster`
- **Bumper Car** (Workshop): `3D-GAMES/Vehicle Workshop.dc.html?v=bumper`
- **Rocket Skates** (Workshop): `3D-GAMES/Vehicle Workshop.dc.html?v=rskates`
- **Wrecking Crane** (Workshop): `3D-GAMES/Vehicle Workshop.dc.html?v=crane`
- **Hot Air Balloon** (Workshop): `3D-GAMES/Vehicle Workshop.dc.html?v=balloon`
- **Robot Spider** (Workshop): `3D-GAMES/Vehicle Workshop.dc.html?v=spider`

