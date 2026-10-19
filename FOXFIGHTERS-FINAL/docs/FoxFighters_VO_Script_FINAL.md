# Fox Fighters — FINAL voice script (lines still to record)

Every line the game can speak that does NOT have a recorded clip yet: menus, announcer calls, specials, supers, taunts, win quotes, VS and rival lines, and the narrated arcade endings.

**How to make them:** record each line as an MP3 at the exact `file` path shown (the folder is the speaker, inside `audio/vo/`). Keep the wording exactly as written; the punctuation sets the delivery. ALL-CAPS lines are shouted. Send the clips back and they get added to `manifest.json` so the game plays them.

**Voice references for Chatterbox:** speakers marked ★ already have recorded clips in `audio/vo/<speaker>/`. Use one of those as the reference so the new lines match. The rest are new voices.

**Totals: 356 new lines** (119 lines are already recorded and are left out).


## ANN ★: 151 lines

ANNOUNCER: big, punchy arcade fighting-game announcer. Short, loud, clear. Menu lines calmer and friendly.

| # | file | line | plays when |
|---|---|---|---|
| 1 | `ann/press-g-for-the-audio-guide.mp3` | Press G for the audio guide. | announcer |
| 2 | `ann/training-choose-your-fox.mp3` | Training. Choose your fox! | announcer |
| 3 | `ann/pick-your-team.mp3` | Pick your team. | announcer |
| 4 | `ann/fox-one.mp3` | Fox one. | announcer |
| 5 | `ann/now-pick-a-sparring-partner.mp3` | Now pick a sparring partner. | announcer |
| 6 | `ann/round-four.mp3` | Round four! | announcer |
| 7 | `ann/round-five.mp3` | Round five! | announcer |
| 8 | `ann/trial-clear.mp3` | Trial clear! | announcer |
| 9 | `ann/how-to-play.mp3` | How to play. | announcer |
| 10 | `ann/online-make-a-room-and-send-the-link-to-a-friend.mp3` | Online. Make a room and send the link to a friend. | announcer |
| 11 | `ann/sword-workshop.mp3` | Sword workshop. | announcer |
| 12 | `ann/arcade.mp3` | Arcade. | menu: mode name |
| 13 | `ann/3-foxes-a-bonus-stage-then-suds-9.mp3` | 3 foxes, a bonus stage, then SUDS-9. | menu: Arcade |
| 14 | `ann/online-invite-a-friend.mp3` | Online. Invite A Friend. | menu: mode name |
| 15 | `ann/fight-a-friend-on-their-own-phone.mp3` | Fight a friend on their own phone. | menu: Online. Invite A Friend |
| 16 | `ann/send-them-a-link.mp3` | Send them a link. | menu: Online. Invite A Friend |
| 17 | `ann/2-players.mp3` | 2 Players. | menu: mode name |
| 18 | `ann/one-keyboard-or-two-controllers.mp3` | One keyboard or two controllers. | menu: 2 Players |
| 19 | `ann/best-of-3.mp3` | Best of 3. | menu: 2 Players |
| 20 | `ann/survival.mp3` | Survival. | menu: mode name |
| 21 | `ann/one-health-bar.mp3` | One health bar. | menu: Survival |
| 22 | `ann/how-many-foxes-can-you-beat.mp3` | How many foxes can you beat? | menu: Survival |
| 23 | `ann/team-battle.mp3` | Team Battle. | menu: mode name |
| 24 | `ann/pick-3-foxes.mp3` | Pick 3 foxes. | menu: Team Battle |
| 25 | `ann/knock-out-their-whole-team.mp3` | Knock out their whole team. | menu: Team Battle |
| 26 | `ann/boss-rush.mp3` | Boss Rush. | menu: mode name; trophy name |
| 27 | `ann/three-suds-9s-in-a-row.mp3` | Three SUDS-9s in a row. | menu: Boss Rush |
| 28 | `ann/each-one-starts-angrier.mp3` | Each one starts angrier. | menu: Boss Rush |
| 29 | `ann/daily-challenge.mp3` | Daily Challenge. | menu: mode name |
| 30 | `ann/a-new-twist-every-day.mp3` | A new twist every day. | menu: Daily Challenge |
| 31 | `ann/training.mp3` | Training. | menu: mode name |
| 32 | `ann/practise-with-any-fox.mp3` | Practise with any fox. | menu: Training |
| 33 | `ann/combo-trials-input-display-dummy-settings.mp3` | Combo trials, input display, dummy settings. | menu: Training |
| 34 | `ann/spin-each-fox-round-and-fine-tune-the-sword-on-its-back.mp3` | Spin each fox round and fine-tune the sword on its back. | menu: Sword Workshop |
| 35 | `ann/difficulty-audio-guide-easy-controls.mp3` | Difficulty, audio guide, easy controls. | menu: Options |
| 36 | `ann/play-by-sound-beeps-for-distance-and-attacks-spoken-menus-and-health.mp3` | Play by sound: beeps for distance and attacks, spoken menus and health. | options: Audio guide |
| 37 | `ann/g-anywhere.mp3` | G anywhere. | options: Audio guide |
| 38 | `ann/one-button-any-attack-button-picks-the-best-move-and-blocks-for-you.mp3` | One button: any attack button picks the best move and blocks for you. | options: Controls |
| 39 | `ann/slow-plays-the-fights-at-70-speed.mp3` | Slow plays the fights at 70% speed. | options: Game speed |
| 40 | `ann/high-contrast-darkens-the-background-so-the-foxes-stand-out.mp3` | High contrast darkens the background so the foxes stand out. | options: Contrast |
| 41 | `ann/walk-left-and-right.mp3` | Walk left and right. | tutorial (how to play) |
| 42 | `ann/tap-3-for-a-power-spin.mp3` | Tap 3 for a power spin. | tutorial (how to play) |
| 43 | `ann/hold-punch-draw-your-sword-and-swing.mp3` | Hold punch: draw your sword and swing. | tutorial (how to play) |
| 44 | `ann/hold-kick-draw-your-laser-and-fire.mp3` | Hold kick: draw your laser and fire. | tutorial (how to play) |
| 45 | `ann/you-re-ready-try-the-arcade.mp3` | You're ready! Try the Arcade. | tutorial (how to play) |
| 46 | `ann/first-win.mp3` | First Win. | trophy name |
| 47 | `ann/arcade-clear.mp3` | Arcade Clear. | trophy name |
| 48 | `ann/one-credit.mp3` | One Credit. | trophy name |
| 49 | `ann/crystal-clear.mp3` | Crystal Clear. | trophy name |
| 50 | `ann/comeback-kid.mp3` | Comeback Kid. | trophy name |
| 51 | `ann/ten-hit-combo.mp3` | Ten hit Combo. | trophy name |
| 52 | `ann/all-kicks.mp3` | All Kicks. | trophy name |
| 53 | `ann/special-finish.mp3` | Special Finish. | trophy name |
| 54 | `ann/see-you-later.mp3` | See You Later. | trophy name |
| 55 | `ann/home-renovation.mp3` | Home Renovation. | trophy name |
| 56 | `ann/seeing-stars.mp3` | Seeing Stars. | trophy name |
| 57 | `ann/not-today.mp3` | Not Today. | trophy name |
| 58 | `ann/nice-try.mp3` | Nice Try. | trophy name |
| 59 | `ann/show-off.mp3` | Show-Off. | trophy name |
| 60 | `ann/car-smasher.mp3` | Car Smasher. | trophy name |
| 61 | `ann/speed-smash.mp3` | Speed Smash. | trophy name |
| 62 | `ann/survivor.mp3` | Survivor. | trophy name |
| 63 | `ann/iron-fox.mp3` | Iron Fox. | trophy name |
| 64 | `ann/team-player.mp3` | Team Player. | trophy name |
| 65 | `ann/couch-champ.mp3` | Couch Champ. | trophy name |
| 66 | `ann/daily-dose.mp3` | Daily Dose. | trophy name |
| 67 | `ann/by-ear.mp3` | By Ear. | trophy name |
| 68 | `ann/ready-to-fight.mp3` | Ready To Fight. | trophy name |
| 69 | `ann/ben-25-percent.mp3` | Ben, 25 percent. | audio guide health |
| 70 | `ann/ben-50-percent.mp3` | Ben, 50 percent. | audio guide health |
| 71 | `ann/ben-75-percent.mp3` | Ben, 75 percent. | audio guide health |
| 72 | `ann/hope-25-percent.mp3` | Hope, 25 percent. | audio guide health |
| 73 | `ann/hope-50-percent.mp3` | Hope, 50 percent. | audio guide health |
| 74 | `ann/hope-75-percent.mp3` | Hope, 75 percent. | audio guide health |
| 75 | `ann/noble-25-percent.mp3` | Noble, 25 percent. | audio guide health |
| 76 | `ann/noble-50-percent.mp3` | Noble, 50 percent. | audio guide health |
| 77 | `ann/noble-75-percent.mp3` | Noble, 75 percent. | audio guide health |
| 78 | `ann/king-might-25-percent.mp3` | King Might, 25 percent. | audio guide health |
| 79 | `ann/king-might-50-percent.mp3` | King Might, 50 percent. | audio guide health |
| 80 | `ann/king-might-75-percent.mp3` | King Might, 75 percent. | audio guide health |
| 81 | `ann/michelle-25-percent.mp3` | Michelle, 25 percent. | audio guide health |
| 82 | `ann/michelle-50-percent.mp3` | Michelle, 50 percent. | audio guide health |
| 83 | `ann/michelle-75-percent.mp3` | Michelle, 75 percent. | audio guide health |
| 84 | `ann/oyakata.mp3` | Oyakata | fighter name (for "A versus B") |
| 85 | `ann/oyakata-wins.mp3` | Oyakata wins! | winner call |
| 86 | `ann/oyakata-steps-in.mp3` | Oyakata steps in! | team battle |
| 87 | `ann/oyakata-25-percent.mp3` | Oyakata, 25 percent. | audio guide health |
| 88 | `ann/oyakata-50-percent.mp3` | Oyakata, 50 percent. | audio guide health |
| 89 | `ann/oyakata-75-percent.mp3` | Oyakata, 75 percent. | audio guide health |
| 90 | `ann/barnacle.mp3` | Barnacle | fighter name (for "A versus B") |
| 91 | `ann/barnacle-wins.mp3` | Barnacle wins! | winner call |
| 92 | `ann/barnacle-steps-in.mp3` | Barnacle steps in! | team battle |
| 93 | `ann/barnacle-25-percent.mp3` | Barnacle, 25 percent. | audio guide health |
| 94 | `ann/barnacle-50-percent.mp3` | Barnacle, 50 percent. | audio guide health |
| 95 | `ann/barnacle-75-percent.mp3` | Barnacle, 75 percent. | audio guide health |
| 96 | `ann/jalape-o-jack.mp3` | Jalapeño Jack | fighter name (for "A versus B") |
| 97 | `ann/jalape-o-jack-wins.mp3` | Jalapeño Jack wins! | winner call |
| 98 | `ann/jalape-o-jack-steps-in.mp3` | Jalapeño Jack steps in! | team battle |
| 99 | `ann/jalape-o-jack-25-percent.mp3` | Jalapeño Jack, 25 percent. | audio guide health |
| 100 | `ann/jalape-o-jack-50-percent.mp3` | Jalapeño Jack, 50 percent. | audio guide health |
| 101 | `ann/jalape-o-jack-75-percent.mp3` | Jalapeño Jack, 75 percent. | audio guide health |
| 102 | `ann/rook.mp3` | Rook | fighter name (for "A versus B") |
| 103 | `ann/rook-wins.mp3` | Rook wins! | winner call |
| 104 | `ann/rook-steps-in.mp3` | Rook steps in! | team battle |
| 105 | `ann/rook-25-percent.mp3` | Rook, 25 percent. | audio guide health |
| 106 | `ann/rook-50-percent.mp3` | Rook, 50 percent. | audio guide health |
| 107 | `ann/rook-75-percent.mp3` | Rook, 75 percent. | audio guide health |
| 108 | `ann/lox.mp3` | Lox | fighter name (for "A versus B") |
| 109 | `ann/lox-wins.mp3` | Lox wins! | winner call |
| 110 | `ann/lox-steps-in.mp3` | Lox steps in! | team battle |
| 111 | `ann/lox-25-percent.mp3` | Lox, 25 percent. | audio guide health |
| 112 | `ann/lox-50-percent.mp3` | Lox, 50 percent. | audio guide health |
| 113 | `ann/lox-75-percent.mp3` | Lox, 75 percent. | audio guide health |
| 114 | `ann/iron-warden.mp3` | Iron Warden | fighter name (for "A versus B") |
| 115 | `ann/iron-warden-wins.mp3` | Iron Warden wins! | winner call |
| 116 | `ann/iron-warden-steps-in.mp3` | Iron Warden steps in! | team battle |
| 117 | `ann/iron-warden-25-percent.mp3` | Iron Warden, 25 percent. | audio guide health |
| 118 | `ann/iron-warden-50-percent.mp3` | Iron Warden, 50 percent. | audio guide health |
| 119 | `ann/iron-warden-75-percent.mp3` | Iron Warden, 75 percent. | audio guide health |
| 120 | `ann/maker-prime.mp3` | Maker Prime | fighter name (for "A versus B") |
| 121 | `ann/maker-prime-wins.mp3` | Maker Prime wins! | winner call |
| 122 | `ann/maker-prime-steps-in.mp3` | Maker Prime steps in! | team battle |
| 123 | `ann/maker-prime-25-percent.mp3` | Maker Prime, 25 percent. | audio guide health |
| 124 | `ann/maker-prime-50-percent.mp3` | Maker Prime, 50 percent. | audio guide health |
| 125 | `ann/maker-prime-75-percent.mp3` | Maker Prime, 75 percent. | audio guide health |
| 126 | `ann/suds-9-steps-in.mp3` | SUDS-9 steps in! | team battle |
| 127 | `ann/suds-9-25-percent.mp3` | SUDS-9, 25 percent. | audio guide health |
| 128 | `ann/suds-9-50-percent.mp3` | SUDS-9, 50 percent. | audio guide health |
| 129 | `ann/suds-9-75-percent.mp3` | SUDS-9, 75 percent. | audio guide health |
| 130 | `ann/slagback.mp3` | Slagback | fighter name (for "A versus B") |
| 131 | `ann/slagback-wins.mp3` | Slagback wins! | winner call |
| 132 | `ann/slagback-steps-in.mp3` | Slagback steps in! | team battle |
| 133 | `ann/slagback-25-percent.mp3` | Slagback, 25 percent. | audio guide health |
| 134 | `ann/slagback-50-percent.mp3` | Slagback, 50 percent. | audio guide health |
| 135 | `ann/slagback-75-percent.mp3` | Slagback, 75 percent. | audio guide health |
| 136 | `ann/crystal-warden.mp3` | Crystal Warden | fighter name (for "A versus B") |
| 137 | `ann/crystal-warden-wins.mp3` | Crystal Warden wins! | winner call |
| 138 | `ann/crystal-warden-steps-in.mp3` | Crystal Warden steps in! | team battle |
| 139 | `ann/crystal-warden-25-percent.mp3` | Crystal Warden, 25 percent. | audio guide health |
| 140 | `ann/crystal-warden-50-percent.mp3` | Crystal Warden, 50 percent. | audio guide health |
| 141 | `ann/crystal-warden-75-percent.mp3` | Crystal Warden, 75 percent. | audio guide health |
| 142 | `ann/trophies-hi-scores.mp3` | Trophies & hi-scores. | menu: mode name |
| 143 | `ann/options-audio-guide-on.mp3` | Options. Audio guide, on. | options menu (whole line) |
| 144 | `ann/options-audio-guide-off.mp3` | Options. Audio guide, off. | options menu (whole line) |
| 145 | `ann/options-controls-one-button.mp3` | Options. Controls, one button. | options menu (whole line) |
| 146 | `ann/options-controls-standard.mp3` | Options. Controls, standard. | options menu (whole line) |
| 147 | `ann/options-game-speed-slow.mp3` | Options. Game speed, slow. | options menu (whole line) |
| 148 | `ann/options-game-speed-normal.mp3` | Options. Game speed, normal. | options menu (whole line) |
| 149 | `ann/options-contrast-high.mp3` | Options. Contrast, high. | options menu (whole line) |
| 150 | `ann/options-contrast-normal.mp3` | Options. Contrast, normal. | options menu (whole line) |
| 151 | `ann/trophies.mp3` | Trophies. | menu |

## NARR ★: 34 lines

NARRATOR: warm storybook voice for the arcade endings. Unhurried, a little wry.

| # | file | line | plays when |
|---|---|---|---|
| 1 | `narr/she-planted-her-cane-on-the-helipad-and-vaulted-onto-the-railing-just-to-feel-th.mp3` | She planted her cane on the helipad and vaulted onto the railing, just to feel the wind. | ending: HOPE |
| 2 | `narr/his-wheels-were-still-crackling-with-sparks-he-honked-twice-for-luck.mp3` | His wheels were still crackling with sparks. He honked twice. For luck. | ending: NOBLE |
| 3 | `narr/the-king-straightened-his-crown-on-the-helipad-this-roof-is-under-the-crown-s-pr.mp3` | The King straightened his crown on the helipad. "This roof is under the crown's protection." | ending: KING MIGHT |
| 4 | `narr/michelle-fixed-her-tiara-and-took-one-last-look-at-the-sunset.mp3` | Michelle fixed her tiara and took one last look at the sunset. | ending: MICHELLE |
| 5 | `narr/oyakata-threw-a-handful-of-salt-over-the-helipad-to-clean-the-ring.mp3` | Oyakata threw a handful of salt over the helipad to clean the ring. | ending: OYAKATA |
| 6 | `narr/then-he-sat-down-the-whole-roof-shook-suds-9-never-stood-a-chance.mp3` | Then he sat down. The whole roof shook. SUDS-9 never stood a chance. | ending: OYAKATA |
| 7 | `narr/kyoto-sent-him-a-new-mawashi-in-pearl-sail-blue.mp3` | Kyoto sent him a new mawashi, in Pearl Sail blue. | ending: OYAKATA |
| 8 | `narr/barnacle-picked-up-what-was-left-of-suds-9-like-a-crate-on-a-pallet.mp3` | Barnacle picked up what was left of SUDS-9 like a crate on a pallet. | ending: BARNACLE |
| 9 | `narr/he-sold-the-scrap-to-the-salt-building-twice.mp3` | He sold the scrap to the Salt Building. Twice. | ending: BARNACLE |
| 10 | `narr/the-bandits-still-sing-a-song-about-it-it-is-not-a-good-song.mp3` | The bandits still sing a song about it. It is not a good song. | ending: BARNACLE |
| 11 | `narr/jalape-o-jack-tipped-his-hat-to-the-empty-gondola.mp3` | Jalapeño Jack tipped his hat to the empty gondola. | ending: JALAPEÑO JACK |
| 12 | `narr/he-left-one-red-pepper-on-the-helipad-so-they-would-know-who-did-it.mp3` | He left one red pepper on the helipad, so they would know who did it. | ending: JALAPEÑO JACK |
| 13 | `narr/nobody-on-the-pearl-sail-has-dared-to-eat-it.mp3` | Nobody on the Pearl Sail has dared to eat it. | ending: JALAPEÑO JACK |
| 14 | `narr/rook-blew-the-smoke-off-his-laser-and-looked-out-over-meru.mp3` | Rook blew the smoke off his laser and looked out over Meru. | ending: ROOK |
| 15 | `narr/good-view-he-said-good-place-for-a-hideout.mp3` | "Good view," he said. "Good place for a hideout." | ending: ROOK |
| 16 | `narr/the-pearl-sail-changed-every-lock-on-the-building-that-night.mp3` | The Pearl Sail changed every lock on the building that night. | ending: ROOK |
| 17 | `narr/lox-stood-over-the-gondola-rails-gloves-up-breathing-hard.mp3` | Lox stood over the gondola rails, gloves up, breathing hard. | ending: LOX |
| 18 | `narr/luxor-will-hear-about-this-every-word.mp3` | Luxor will hear about this. Every word. | ending: LOX |
| 19 | `narr/he-hung-suds-9-s-squeegee-on-the-wall-of-his-throne-room-it-is-still-there.mp3` | He hung SUDS-9's squeegee on the wall of his throne room. It is still there. | ending: LOX |
| 20 | `narr/the-iron-warden-stomped-once-on-the-helipad-every-window-in-the-pearl-sail-rattl.mp3` | The Iron Warden stomped once on the helipad. Every window in the Pearl Sail rattled. | ending: IRON WARDEN |
| 21 | `narr/it-scanned-the-horizon-for-the-next-challenger-none-came.mp3` | It scanned the horizon for the next challenger. None came. | ending: IRON WARDEN |
| 22 | `narr/the-meru-arena-put-it-back-on-guard-duty-it-now-waves-at-the-crowd.mp3` | The Meru Arena put it back on guard duty. It now waves at the crowd. | ending: IRON WARDEN |
| 23 | `narr/maker-prime-lifted-suds-9-in-its-claw-and-carried-it-home-to-the-factory.mp3` | Maker Prime lifted SUDS-9 in its claw and carried it home to the factory. | ending: MAKER PRIME |
| 24 | `narr/three-days-later-a-new-window-cleaner-rolled-out-it-was-very-polite.mp3` | Three days later a new window cleaner rolled out. It was very polite. | ending: MAKER PRIME |
| 25 | `narr/the-pearl-sail-has-never-been-cleaner-or-more-nervous.mp3` | The Pearl Sail has never been cleaner. Or more nervous. | ending: MAKER PRIME |
| 26 | `narr/suds-9-cleaned-the-helipad-until-it-shone-like-a-mirror.mp3` | SUDS-9 cleaned the helipad until it shone like a mirror. | ending: SUDS-9 |
| 27 | `narr/then-he-cleaned-the-gondola-then-the-moon-as-far-as-his-pole-would-reach.mp3` | Then he cleaned the gondola. Then the moon, as far as his pole would reach. | ending: SUDS-9 |
| 28 | `narr/the-pearl-sail-gave-him-a-raise-one-extra-bucket.mp3` | The Pearl Sail gave him a raise: one extra bucket. | ending: SUDS-9 |
| 29 | `narr/slagback-stood-on-the-helipad-glowing-in-the-dark-like-a-sunset-that-never-ended.mp3` | Slagback stood on the helipad, glowing in the dark like a sunset that never ended. | ending: SLAGBACK |
| 30 | `narr/where-it-walked-the-roof-tiles-turned-to-glass.mp3` | Where it walked, the roof tiles turned to glass. | ending: SLAGBACK |
| 31 | `narr/meru-calls-the-pearl-sail-the-lava-tower-now-nobody-argues.mp3` | Meru calls the Pearl Sail the Lava Tower now. Nobody argues. | ending: SLAGBACK |
| 32 | `narr/the-crystal-warden-stood-on-the-helipad-and-the-moonlight-broke-into-a-thousand-.mp3` | The Crystal Warden stood on the helipad and the moonlight broke into a thousand colours across Meru. | ending: CRYSTAL WARDEN |
| 33 | `narr/every-window-on-the-pearl-sail-hummed-one-clear-note.mp3` | Every window on the Pearl Sail hummed one clear note. | ending: CRYSTAL WARDEN |
| 34 | `narr/the-caves-under-luxor-glow-a-little-brighter-now-it-is-waiting-for-the-next-chal.mp3` | The caves under Luxor glow a little brighter now. It is waiting for the next challenger. | ending: CRYSTAL WARDEN |

## BEN ★: 5 lines

BEN: the hero fox. Young, brave, upbeat.

| # | file | line | plays when |
|---|---|---|---|
| 1 | `ben/fox-pop.mp3` | Fox pop! | special move call |
| 2 | `ben/fox-beam-max.mp3` | Fox beam max! | heard in play; super / special call |
| 3 | `ben/let-prince-max-go-rook.mp3` | Let Prince Max go, Rook. | rival line vs ROOK; rival reply to ROOK |
| 4 | `ben/luxor-is-a-long-way-from-home.mp3` | Luxor is a long way from home. | rival line vs LOX; rival reply to LOX |
| 5 | `ben/is-it-smiling.mp3` | Is it... smiling? | rival line vs SLAGBACK; rival reply to SLAGBACK |

## HOPE ★: 5 lines

HOPE: confident, quick-witted, cheerful. She hears everything coming.

| # | file | line | plays when |
|---|---|---|---|
| 1 | `hope/vault-dive.mp3` | Vault dive! | heard in play; special move call |
| 2 | `hope/stardust-vault.mp3` | Stardust vault! | heard in play; super / special call |
| 3 | `hope/there-s-only-room-for-one-of-us.mp3` | There's only room for one of us. | rival line vs HOPE |
| 4 | `hope/agreed.mp3` | Agreed. | rival reply to HOPE |
| 5 | `hope/your-feet-are-so-quiet.mp3` | Your feet are so quiet. | rival line vs MICHELLE; rival reply to MICHELLE |

## NOBLE ★: 7 lines

NOBLE: big upper-body-strength energy, playful, loud.

| # | file | line | plays when |
|---|---|---|---|
| 1 | `noble/rolling-chair.mp3` | Rolling chair! | heard in play; special move call |
| 2 | `noble/thunder-wheels.mp3` | Thunder Wheels! | flurry (5 fast punches) |
| 3 | `noble/thunder-chair.mp3` | Thunder chair! | heard in play; super / special call |
| 4 | `noble/thunder-surge.mp3` | Thunder surge! | mash PUNCH |
| 5 | `noble/thunder-arc.mp3` | Thunder arc! | heard in play; mash KICK |
| 6 | `noble/there-s-only-room-for-one-of-us.mp3` | There's only room for one of us. | rival line vs NOBLE |
| 7 | `noble/agreed.mp3` | Agreed. | rival reply to NOBLE |

## MIGHT ★: 6 lines

KING MIGHT: old master king of Meru. Deep, regal, booming.

| # | file | line | plays when |
|---|---|---|---|
| 1 | `might/royal-crusher.mp3` | Royal crusher! | heard in play; special move call |
| 2 | `might/knee-press.mp3` | Knee press! | special move call |
| 3 | `might/royal-decree.mp3` | Royal decree! | heard in play; super / special call |
| 4 | `might/there-s-only-room-for-one-of-us.mp3` | There's only room for one of us. | rival line vs KING MIGHT |
| 5 | `might/agreed.mp3` | Agreed. | rival reply to KING MIGHT |
| 6 | `might/old-friend.mp3` | Old friend. | rival line vs OYAKATA; rival reply to OYAKATA |

## MICHELLE ★: 8 lines

PRINCESS MICHELLE: fast, sharp, proud, a little teasing.

| # | file | line | plays when |
|---|---|---|---|
| 1 | `michelle/palm-blast.mp3` | Palm blast! | special move call |
| 2 | `michelle/spinning-crane-kick.mp3` | Spinning crane kick! | special move call |
| 3 | `michelle/lightning-kicks.mp3` | Lightning Kicks! | flurry (5 fast punches) |
| 4 | `michelle/thousand-kicks.mp3` | Thousand kicks! | super / special call |
| 5 | `michelle/then-you-ll-never-hear-me-coming.mp3` | Then you'll never hear me coming. | rival line vs HOPE; rival reply to HOPE |
| 6 | `michelle/there-s-only-room-for-one-of-us.mp3` | There's only room for one of us. | rival line vs MICHELLE |
| 7 | `michelle/agreed.mp3` | Agreed. | rival reply to MICHELLE |
| 8 | `michelle/pretty-slow-for-a-bandit.mp3` | Pretty slow for a bandit. | rival line vs JALAPEÑO JACK; rival reply to JALAPEÑO JACK |

## SUMO: 15 lines

OYAKATA: huge jolly sumo. Deep, rolling, warm but heavy.

| # | file | line | plays when |
|---|---|---|---|
| 1 | `sumo/sumo-torpedo.mp3` | Sumo torpedo! | heard in play; special move call |
| 2 | `sumo/belly-splash.mp3` | Belly splash! | heard in play; special move call |
| 3 | `sumo/hundred-palm.mp3` | Hundred Palm! | flurry (5 fast punches) |
| 4 | `sumo/hundred-palm-zenith.mp3` | Hundred palm zenith! | heard in play; super / special call |
| 5 | `sumo/bonk.mp3` | Bonk! | head bonk (jump + punch on head); heard in play |
| 6 | `sumo/fox-toss.mp3` | Fox toss! | throw forward |
| 7 | `sumo/body-slam.mp3` | Body slam! | throw back |
| 8 | `sumo/come-little-one.mp3` | COME, LITTLE ONE! | heard in play; taunt |
| 9 | `sumo/the-ring-is-mine.mp3` | THE RING IS MINE! | win quote |
| 10 | `sumo/step-into-my-ring.mp3` | Step into my ring. | VS screen line; rival line vs BEN; rival line vs CRYSTAL WARDEN; rival line vs HOPE; rival line vs IRON WARDEN; rival li |
| 11 | `sumo/old-king-the-ring-remembers-you.mp3` | Old king. The ring remembers you. | rival line vs KING MIGHT; rival reply to KING MIGHT |
| 12 | `sumo/there-s-only-room-for-one-of-us.mp3` | There's only room for one of us. | rival line vs OYAKATA |
| 13 | `sumo/agreed.mp3` | Agreed. | rival reply to OYAKATA |
| 14 | `sumo/crates-do-not-push-back.mp3` | Crates do not push back. | rival line vs BARNACLE; rival reply to BARNACLE |
| 15 | `sumo/come-little-boxer.mp3` | Come, little boxer. | rival line vs LOX; rival reply to LOX |

## BARNACLE: 15 lines

BARNACLE: gruff dockworker bandit, forklift muscle. Gravelly.

| # | file | line | plays when |
|---|---|---|---|
| 1 | `barnacle/crate-toss.mp3` | Crate toss! | special move call |
| 2 | `barnacle/forklift-slam.mp3` | Forklift slam! | special move call |
| 3 | `barnacle/salt-flurry.mp3` | Salt Flurry! | flurry (5 fast punches) |
| 4 | `barnacle/forklift-finale.mp3` | Forklift finale! | super / special call |
| 5 | `barnacle/bonk.mp3` | Bonk! | head bonk (jump + punch on head) |
| 6 | `barnacle/fox-toss.mp3` | Fox toss! | throw forward |
| 7 | `barnacle/body-slam.mp3` | Body slam! | throw back |
| 8 | `barnacle/come-and-get-it.mp3` | COME AND GET IT! | taunt |
| 9 | `barnacle/heavy-lifting.mp3` | HEAVY LIFTING! | win quote |
| 10 | `barnacle/i-lift-heavier-things-than-you.mp3` | I lift heavier things than you. | VS screen line; rival line vs BEN; rival line vs CRYSTAL WARDEN; rival line vs HOPE; rival line vs IRON WARDEN; rival li |
| 11 | `barnacle/i-lift-crates-bigger-than-you.mp3` | I lift crates bigger than you. | rival line vs OYAKATA; rival reply to OYAKATA |
| 12 | `barnacle/there-s-only-room-for-one-of-us.mp3` | There's only room for one of us. | rival line vs BARNACLE |
| 13 | `barnacle/agreed.mp3` | Agreed. | rival reply to BARNACLE |
| 14 | `barnacle/you-owe-me-a-forklift-jack.mp3` | You owe me a forklift, Jack. | rival line vs JALAPEÑO JACK; rival reply to JALAPEÑO JACK |
| 15 | `barnacle/the-salt-crew-stays-out-of-your-cave.mp3` | The Salt crew stays out of your cave. | rival line vs ROOK; rival reply to ROOK |

## JACK: 15 lines

JALAPENO JACK: swaggering hot-pepper gunslinger. Drawly, sly.

| # | file | line | plays when |
|---|---|---|---|
| 1 | `jack/pepper-boom.mp3` | Pepper boom! | heard in play; special move call |
| 2 | `jack/chilli-flip.mp3` | Chilli flip! | special move call |
| 3 | `jack/jalape-o-jabs.mp3` | Jalapeño Jabs! | flurry (5 fast punches) |
| 4 | `jack/pepper-storm.mp3` | Pepper storm! | super / special call |
| 5 | `jack/bonk.mp3` | Bonk! | head bonk (jump + punch on head) |
| 6 | `jack/fox-toss.mp3` | Fox toss! | throw forward |
| 7 | `jack/body-slam.mp3` | Body slam! | throw back |
| 8 | `jack/too-hot-for-you.mp3` | TOO HOT FOR YOU? | heard in play; taunt |
| 9 | `jack/spicy.mp3` | SPICY! | win quote |
| 10 | `jack/hope-you-like-it-hot.mp3` | Hope you like it hot. | VS screen line; rival line vs BEN; rival line vs CRYSTAL WARDEN; rival line vs HOPE; rival line vs IRON WARDEN; rival li |
| 11 | `jack/pretty-quick-for-a-princess.mp3` | Pretty quick for a princess. | rival line vs MICHELLE; rival reply to MICHELLE |
| 12 | `jack/put-it-on-my-tab.mp3` | Put it on my tab. | rival line vs BARNACLE; rival reply to BARNACLE |
| 13 | `jack/there-s-only-room-for-one-of-us.mp3` | There's only room for one of us. | rival line vs JALAPEÑO JACK |
| 14 | `jack/agreed.mp3` | Agreed. | rival reply to JALAPEÑO JACK |
| 15 | `jack/bet-i-draw-faster.mp3` | Bet I draw faster. | rival line vs ROOK; rival reply to ROOK |

## ROOK: 16 lines

ROOK: bandit boss, cool long-range sniper. Low, dry, calm.

| # | file | line | plays when |
|---|---|---|---|
| 1 | `rook/sniper-beam.mp3` | Sniper beam! | special move call |
| 2 | `rook/duster-dash.mp3` | Duster dash! | special move call |
| 3 | `rook/bandit-barrage.mp3` | Bandit Barrage! | flurry (5 fast punches) |
| 4 | `rook/sniper-overcharge.mp3` | Sniper overcharge! | super / special call |
| 5 | `rook/bonk.mp3` | Bonk! | head bonk (jump + punch on head) |
| 6 | `rook/fox-toss.mp3` | Fox toss! | throw forward |
| 7 | `rook/body-slam.mp3` | Body slam! | throw back |
| 8 | `rook/stay-right-there.mp3` | STAY RIGHT THERE. | taunt |
| 9 | `rook/never-missed.mp3` | NEVER MISSED. | win quote |
| 10 | `rook/nowhere-to-hide-up-here.mp3` | Nowhere to hide up here. | VS screen line; rival line vs CRYSTAL WARDEN; rival line vs HOPE; rival line vs IRON WARDEN; rival line vs KING MIGHT; r |
| 11 | `rook/beat-me-first.mp3` | Beat me first. | rival line vs BEN; rival reply to BEN |
| 12 | `rook/and-my-crew-stays-off-your-roof.mp3` | And my crew stays off your roof. | rival line vs BARNACLE; rival reply to BARNACLE |
| 13 | `rook/bet-you-miss.mp3` | Bet you miss. | rival line vs JALAPEÑO JACK; rival reply to JALAPEÑO JACK |
| 14 | `rook/there-s-only-room-for-one-of-us.mp3` | There's only room for one of us. | rival line vs ROOK |
| 15 | `rook/agreed.mp3` | Agreed. | rival reply to ROOK |
| 16 | `rook/then-luxor-can-take-a-laser.mp3` | Then Luxor can take a laser. | rival line vs LOX; rival reply to LOX |

## LOX: 16 lines

LOX: heavyweight boxer, leader of Luxor. Big chest voice, brash.

| # | file | line | plays when |
|---|---|---|---|
| 1 | `lox/dash-straight.mp3` | Dash straight! | heard in play; special move call |
| 2 | `lox/dash-upper.mp3` | Dash upper! | heard in play; special move call |
| 3 | `lox/body-blows.mp3` | Body Blows! | flurry (5 fast punches) |
| 4 | `lox/knockout-rush.mp3` | Knockout rush! | heard in play; super / special call |
| 5 | `lox/bonk.mp3` | Bonk! | head bonk (jump + punch on head); heard in play |
| 6 | `lox/fox-toss.mp3` | Fox toss! | throw forward |
| 7 | `lox/body-slam.mp3` | Body slam! | throw back |
| 8 | `lox/hit-me-i-dare-you.mp3` | HIT ME. I DARE YOU. | heard in play; taunt |
| 9 | `lox/knockout.mp3` | KNOCKOUT! | win quote |
| 10 | `lox/gloves-up.mp3` | Gloves up. | VS screen line; rival line vs BARNACLE; rival line vs CRYSTAL WARDEN; rival line vs HOPE; rival line vs IRON WARDEN; riv |
| 11 | `lox/so-is-your-luck.mp3` | So is your luck. | rival line vs BEN; rival reply to BEN |
| 12 | `lox/gloves-against-palms-let-us-see.mp3` | Gloves against palms. Let us see. | rival line vs OYAKATA; rival reply to OYAKATA |
| 13 | `lox/luxor-does-not-take-orders-from-a-cave-bandit.mp3` | Luxor does not take orders from a cave bandit. | rival line vs ROOK; rival reply to ROOK |
| 14 | `lox/there-s-only-room-for-one-of-us.mp3` | There's only room for one of us. | rival line vs LOX |
| 15 | `lox/agreed.mp3` | Agreed. | rival reply to LOX |
| 16 | `lox/back-to-the-lava-with-you.mp3` | Back to the lava with you. | rival line vs SLAGBACK; rival reply to SLAGBACK |

## WARDEN: 14 lines

IRON WARDEN: deep robotic fortress. Slow, metallic, flat.

| # | file | line | plays when |
|---|---|---|---|
| 1 | `warden/rocket-punch.mp3` | Rocket punch! | heard in play; special move call |
| 2 | `warden/stomp.mp3` | Stomp! | heard in play; special move call |
| 3 | `warden/piston-punches.mp3` | Piston Punches! | flurry (5 fast punches) |
| 4 | `warden/double-rocket.mp3` | Double rocket! | heard in play; super / special call |
| 5 | `warden/bonk.mp3` | Bonk! | head bonk (jump + punch on head); heard in play |
| 6 | `warden/fox-toss.mp3` | Fox toss! | throw forward |
| 7 | `warden/body-slam.mp3` | Body slam! | throw back |
| 8 | `warden/intruder-detected.mp3` | INTRUDER DETECTED. | heard in play; taunt |
| 9 | `warden/arena-secured.mp3` | ARENA SECURED. | win quote |
| 10 | `warden/halt-you-will-not-pass.mp3` | Halt. You will not pass. | VS screen line; rival line vs BARNACLE; rival line vs BEN; rival line vs CRYSTAL WARDEN; rival line vs HOPE; rival line  |
| 11 | `warden/there-s-only-room-for-one-of-us.mp3` | There's only room for one of us. | rival line vs IRON WARDEN |
| 12 | `warden/agreed.mp3` | Agreed. | rival reply to IRON WARDEN |
| 13 | `warden/negative-i-guard-the-arena.mp3` | Negative. I guard the arena. | rival line vs MAKER PRIME; rival reply to MAKER PRIME |
| 14 | `warden/halt.mp3` | Halt. | rival line vs SUDS-9; rival reply to SUDS-9 |

## PRIME: 14 lines

MAKER PRIME: cold factory robot. Clipped, scanning, precise.

| # | file | line | plays when |
|---|---|---|---|
| 1 | `prime/laser-eye.mp3` | Laser eye! | heard in play; special move call |
| 2 | `prime/drill-spin.mp3` | Drill spin! | special move call |
| 3 | `prime/claw-flurry.mp3` | Claw Flurry! | flurry (5 fast punches) |
| 4 | `prime/laser-overload.mp3` | Laser overload! | super / special call |
| 5 | `prime/bonk.mp3` | Bonk! | head bonk (jump + punch on head) |
| 6 | `prime/fox-toss.mp3` | Fox toss! | throw forward |
| 7 | `prime/body-slam.mp3` | Body slam! | throw back |
| 8 | `prime/you-will-be-rebuilt.mp3` | YOU WILL BE REBUILT. | taunt |
| 9 | `prime/production-complete.mp3` | PRODUCTION COMPLETE. | win quote |
| 10 | `prime/scanning-weak-rebuild.mp3` | Scanning. Weak. Rebuild. | VS screen line; rival line vs BARNACLE; rival line vs BEN; rival line vs CRYSTAL WARDEN; rival line vs HOPE; rival line  |
| 11 | `prime/unit-warden-report-for-upgrade.mp3` | Unit Warden. Report for upgrade. | rival line vs IRON WARDEN; rival reply to IRON WARDEN |
| 12 | `prime/there-s-only-room-for-one-of-us.mp3` | There's only room for one of us. | rival line vs MAKER PRIME |
| 13 | `prime/agreed.mp3` | Agreed. | rival reply to MAKER PRIME |
| 14 | `prime/you-are-a-defective-unit.mp3` | You are a defective unit. | rival line vs SUDS-9; rival reply to SUDS-9 |

## SUDS9 ★: 8 lines

SUDS-9: polite window-cleaning robot. Customer-service calm that turns menacing.

| # | file | line | plays when |
|---|---|---|---|
| 1 | `suds9/scrub-flurry.mp3` | Scrub Flurry! | flurry (5 fast punches) |
| 2 | `suds9/bonk.mp3` | Bonk! | head bonk (jump + punch on head) |
| 3 | `suds9/fox-toss.mp3` | Fox toss! | throw forward |
| 4 | `suds9/body-slam.mp3` | Body slam! | throw back |
| 5 | `suds9/your-armour-is-filthy.mp3` | YOUR ARMOUR IS FILTHY. | rival line vs IRON WARDEN; rival reply to IRON WARDEN |
| 6 | `suds9/i-prefer-the-term-sparkling.mp3` | I PREFER THE TERM SPARKLING. | rival line vs MAKER PRIME; rival reply to MAKER PRIME |
| 7 | `suds9/there-s-only-room-for-one-of-us.mp3` | There's only room for one of us. | rival line vs SUDS-9 |
| 8 | `suds9/agreed.mp3` | Agreed. | rival reply to SUDS-9 |

## SLAG: 14 lines

SLAGBACK: molten lava beast. Hissing, gravelly, slow.

| # | file | line | plays when |
|---|---|---|---|
| 1 | `slag/lava-lob.mp3` | Lava lob! | heard in play; special move call |
| 2 | `slag/magma-slam.mp3` | Magma slam! | heard in play; special move call |
| 3 | `slag/molten-fists.mp3` | Molten Fists! | flurry (5 fast punches) |
| 4 | `slag/eruption.mp3` | Eruption! | heard in play; super / special call |
| 5 | `slag/bonk.mp3` | Bonk! | head bonk (jump + punch on head); heard in play |
| 6 | `slag/fox-toss.mp3` | Fox toss! | throw forward |
| 7 | `slag/body-slam.mp3` | Body slam! | throw back |
| 8 | `slag/burn.mp3` | BURN. | heard in play; taunt |
| 9 | `slag/melt.mp3` | MELT. | win quote |
| 10 | `slag/hssssss.mp3` | Hssssss. | VS screen line; rival line vs BARNACLE; rival line vs CRYSTAL WARDEN; rival line vs HOPE; rival line vs IRON WARDEN; riv |
| 11 | `slag/hsssss.mp3` | Hsssss. | rival line vs BEN; rival reply to BEN |
| 12 | `slag/hssss-home.mp3` | Hssss... home. | rival line vs LOX; rival reply to LOX |
| 13 | `slag/there-s-only-room-for-one-of-us.mp3` | There's only room for one of us. | rival line vs SLAGBACK |
| 14 | `slag/agreed.mp3` | Agreed. | rival reply to SLAGBACK |

## CRYSTAL: 13 lines

CRYSTAL WARDEN: crystal golem. Deep, resonant, ringing, ancient.

| # | file | line | plays when |
|---|---|---|---|
| 1 | `crystal/crystal-shard.mp3` | Crystal shard! | heard in play; special move call |
| 2 | `crystal/gem-cyclone.mp3` | Gem cyclone! | heard in play; special move call |
| 3 | `crystal/crystal-rise.mp3` | Crystal rise! | special move call |
| 4 | `crystal/prism-punches.mp3` | Prism Punches! | flurry (5 fast punches) |
| 5 | `crystal/prism-storm.mp3` | Prism storm! | heard in play; super / special call |
| 6 | `crystal/bonk.mp3` | Bonk! | head bonk (jump + punch on head); heard in play |
| 7 | `crystal/fox-toss.mp3` | Fox toss! | throw forward |
| 8 | `crystal/body-slam.mp3` | Body slam! | throw back |
| 9 | `crystal/shatter.mp3` | SHATTER. | heard in play; taunt |
| 10 | `crystal/crystal-clear.mp3` | CRYSTAL CLEAR. | win quote |
| 11 | `crystal/you-will-shatter.mp3` | You will shatter. | VS screen line; rival line vs BARNACLE; rival line vs BEN; rival line vs HOPE; rival line vs IRON WARDEN; rival line vs  |
| 12 | `crystal/there-s-only-room-for-one-of-us.mp3` | There's only room for one of us. | rival line vs CRYSTAL WARDEN |
| 13 | `crystal/agreed.mp3` | Agreed. | rival reply to CRYSTAL WARDEN |
