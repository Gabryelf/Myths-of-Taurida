
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

[![v0.0.1](https://img.shields.io/badge/v0.0.1-Фундамент-brightgreen?style=for-the-badge&logo=checkmarx&logoColor=white)](../../issues/1)
[![v0.0.2](https://img.shields.io/badge/v0.0.2-Raycast%20и%20подсветка-brightgreen?style=for-the-badge&logo=checkmarx&logoColor=white)](../../issues/2)
[![v0.0.3](https://img.shields.io/badge/v0.0.3-Море%20и%20атмосфера-brightgreen?style=for-the-badge&logo=checkmarx&logoColor=white)](../../issues/3)
[![v0.0.4](https://img.shields.io/badge/v0.0.4-Полководцы%20и%20система%20ходов-blue?style=for-the-badge&logo=progress&logoColor=white)](../../issues/4)
[![v0.0.5](https://img.shields.io/badge/v0.0.5-Карточная%20система%20-blue?style=for-the-badge&logo=progress&logoColor=white)](../../issues/5)
[![v0.0.6](https://img.shields.io/badge/v0.0.6-Боевая%20система%20-blue?style=for-the-badge&logo=progress&logoColor=white)](../../issues/6)
[![v0.0.7](https://img.shields.io/badge/v0.0.7-ИИ,%20баланс,%20звук,%20туториал-blue?style=for-the-badge&logo=progress&logoColor=white)](../../issues/7)
[![v0.0.8](https://img.shields.io/badge/v0.0.8-Тактический%20бой%20-%20баланс-blue?style=for-the-badge&logo=progress&logoColor=white)](../../issues/8)


</div>

![скрин](https://github.com/Gabryelf/Myths-of-Taurida/blob/main/docs/screens/0.0.1-0.0.2.png)
![скрин](https://github.com/Gabryelf/Myths-of-Taurida/blob/main/docs/screens/0.0.3.png)
![скрин](https://github.com/Gabryelf/Myths-of-Taurida/blob/main/docs/screens/0.0.4.png)
![скрин](https://github.com/Gabryelf/Myths-of-Taurida/blob/main/docs/screens/0.0.5.png)
![скрин](https://github.com/Gabryelf/Myths-of-Taurida/blob/main/docs/screens/0.0.6.png)
![скрин](https://github.com/Gabryelf/Myths-of-Taurida/blob/main/docs/screens/0.0.7.png)
![скрин](https://github.com/Gabryelf/Myths-of-Taurida/blob/main/docs/screens/0.0.8.png)
![скрин](https://github.com/Gabryelf/Myths-of-Taurida/blob/main/docs/screens/0.0.9.png)
![скрин](https://github.com/Gabryelf/Myths-of-Taurida/blob/main/docs/screens/0.1.0.png)
![скрин](https://github.com/Gabryelf/Myths-of-Taurida/blob/main/docs/screens/0.1.1.png)

---

## Стек

- **Node.js** + **Vite** (ES-модули, hot-reload, сборка)
- **Three.js** — 3D-сцена, камера, гексы
- **Vanilla JS** — DOM-UI без фреймворков
- **CSS** — модульные файлы с переменными

**Принципы:** domain не знает о THREE/DOM. Renderer читает домен, но не меняет. Всё через `EventBus`.

## 📚 Документация по версиям - полный перечень изменений

[![docs](https://github.com/Gabryelf/Myths-of-Taurida/wiki/Strategy-&-Tactical-0.0.8-version)


---

