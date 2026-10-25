
---

<div align="center">

![Демо игры](./docs/Myths-of-Taurida-logo.gif)

</div>

<div align="center">

**Карточная веб-игра на Node.js с элементами стратегии и тактическими боями — прототип**

![Status](https://img.shields.io/badge/status-in%20development-yellow)
![Version](https://img.shields.io/badge/version-0.3-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)
![Three.js](https://img.shields.io/badge/three.js-r160-blueviolet)

</div>

---

# ТАВРИДА · Легенды полуострова

Пошаговая стратегия на гекс-карте с карточными сражениями.
Сеттинг: Крым, IV в. до н.э. — I в. н.э. Пять фракций, борьба за побережье и степи.

**Идея:** изначально проект планировался как цифровой вариант для Музея Тавриды.
Уже существует аналоговый вариант настольной игры, по которой воссоздаются
механики и стилистика.

---

## 📚 Документация и roadmap

Все версии — как отдельные Issue с полным описанием задач, критериями приёмки
и чеклистом. Ниже — навигация по версиям.

<div align="center">

### Версии

[![v0.0.1](https://img.shields.io/badge/v0.1-Фундамент-brightgreen?style=for-the-badge&logo=checkmarx&logoColor=white)](../../issues/1)
[![v0.0.2](https://img.shields.io/badge/v0.2-Raycast%20и%20подсветка-brightgreen?style=for-the-badge&logo=checkmarx&logoColor=white)](../../issues/2)
[![v0.0.3](https://img.shields.io/badge/v0.3-Море%20и%20атмосфера-blue?style=for-the-badge&logo=progress&logoColor=white)](../../issues/3)


</div>



---

## Стек

- **Node.js** + **Vite** (ES-модули, hot-reload, сборка)
- **Three.js** — 3D-сцена, камера, гексы
- **Vanilla JS** — DOM-UI без фреймворков
- **CSS** — модульные файлы с переменными

**Принципы:** domain не знает о THREE/DOM. Renderer читает домен, но не меняет. Всё через `EventBus`.


## Что на данный момент есть и работает

☑ Гекс-карта из seed

☑ Камера: орбита (drag), зум (wheel), центрирование

☑ Пять фракций с цветными кольцами

☑ Слоистая архитектура

☑ Фабрики сущностей

☑ Модульные CSS с переменными темы

☑ Тосты

☑ Точный raycast по гексам

☑ Hover-подсветка + tooltip с координатами

☑ Selection-подсветка + подсветка соседей

☑ Курсор-pointer над гексами

□ Атмосферное море и звёзды (v0.3)

## Управление

- **Drag** — вращение камеры
- **Колесо** — зум
- **Клик** — тост с координатой (raycast)


---

