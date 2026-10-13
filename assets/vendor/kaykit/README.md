# Готовый герой KayKit · обновление 06

Автор моделей и скелетной анимации — **Kay Lousberg**. Набор: [KayKit Adventurers](https://kaylousberg.itch.io/kaykit-adventurers), версия 1.0, лицензия **CC0**. Оригинальный текст лицензии сохранён в `LICENSE.txt`; описание автора — `UPSTREAM_README.md`.

Источник файлов: https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0. SHA-256 оригиналов записаны в `sources.json`.

В игре используется готовый **Rogue**, его текстура и оригинальные анимации `Idle`, `Running_A`, `Unarmed_Melee_Attack_Punch_A`, `1H_Melee_Attack_Slice_Horizontal`, `2H_Melee_Attack_Stab`, `1H_Melee_Attack_Chop`, `Dodge_Forward`, `Hit_A`, `Interact`, `PickUp`, `Lie_StandUp`. Шлем, нагрудник, поножи и меч взяты из готового Knight того же набора. Древко с наконечником для копья — масштабированный готовый `arrow`, а не новая модель героя.

## Редактирование и сборка

`Rogue.glb` — неизменённый оригинальный герой со всеми 75 авторскими анимациями и T-позой. Его можно импортировать в Blender или другой редактор glTF. `hero.blend` — импортированный оригинал с камерой для нашей игры. В браузере работает Phaser 3: Blender заранее рендерит готовые модели в восемь ракурсов, затем игра выбирает кадры этих изображений. Самодельный рисованный персонаж и старый процедурный скелет в отрисовке больше не используются.

Установить Blender 4.3+ и Python 3 с Pillow. Из корня репозитория:

```sh
npm run character:build
```

`bake_character.py` рендерит оригинального Rogue и экспортирует сведения о клипах. `bake_equipment.py` рендерит готовые части экипировки на совместимом авторском скелете. `pack_sprites.py` обрезает прозрачные поля и собирает WebP-атласы с метаданными в `public/character` и `src/generated/character-atlas.ts`. Промежуточные кадры лежат в `/tmp/kaykit-frames` и `/tmp/kaykit-equipment`.

Бег воспроизводится по фактически пройденному расстоянию; столкновение со стеной останавливает фазу шага. Удар имеет подготовку, один момент контакта и завершение. Скорость боевых клипов адаптирована к игровым действиям. Повороты, смена действий и экипировки используют короткий переход изображений. Нативная 3D-геометрия и скелет в браузере не рассчитываются.

Скачать оригинал: https://andreubk00-dot.github.io/13/downloads/Rogue.glb

Скачать сцену Blender: https://andreubk00-dot.github.io/13/downloads/hero.blend

Лицензия: https://andreubk00-dot.github.io/13/downloads/character-license.txt
