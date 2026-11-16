# 🔥 FlameFrags
### Understanding Combustion Beyond Earth

**An interactive research and exploration platform for studying flame behavior in microgravity and understanding fire safety in future space habitats.**

[Overview](#-overview) · [Features](#-features) · [Scientific Foundation](#-scientific-foundation) · [Technology](#-technology) · [Getting Started](#-getting-started) · [Project Structure](#-project-structure)

---

## 🌌 Overview

Fire behaves differently in space.

On Earth, gravity-driven convection influences how flames develop, spread, and interact with their surroundings. In microgravity, buoyancy-driven flow is greatly reduced, changing flame shape, heat transfer, and combustion behavior.

As humans prepare for longer missions aboard spacecraft, lunar habitats, and eventually Mars, understanding these differences becomes increasingly important.

**FlameFrags** is an interactive platform designed to make space-combustion research more accessible, interpretable, and useful.

The project brings together NASA combustion research, scientific data exploration, AI-assisted analysis, interactive visualizations, and historical spacecraft fire investigations.

## 🚀 Features

### 1. Frags AI
An AI research assistant designed to help users explore combustion science and interpret relevant research data.

- Ask questions about microgravity combustion.
- Explore NASA investigation information.
- Receive explanations grounded in available project data.
- Understand scientific limitations and uncertainty.

### 2. Data Upload
Explore your own combustion datasets alongside the platform's research information.

- Upload supported CSV and TXT datasets.
- Inspect measurements and dataset structure.
- Identify missing values, duplicates, and potential inconsistencies.
- Explore relationships between variables.

*Dataset support depends on the formats and processing capabilities implemented in the current version.*

### 3. Combustion DNA
A research fingerprint for comparing combustion investigations.

- Compare investigation characteristics.
- Explore multiple combustion-related attributes.
- Identify similarities and differences.
- Examine areas where research coverage is limited.

### 4. Research Gap Detector
Explore where existing combustion research provides coverage and where information remains limited.

- Examine research coverage across multiple dimensions.
- Identify underrepresented research areas.
- Explore questions relevant to future space habitats.

### 5. Experiment Detective
An analytical environment for examining experimental datasets.

- Statistical summaries.
- Correlation and regression analysis.
- Outlier identification.
- Data-quality checks.
- Dataset comparisons and visualizations.

### 6. Habitat Relevance Explorer
Explore how combustion research relates to different exploration environments.

Compare research against habitat scenarios such as:

- International Space Station
- Lunar habitats
- Lunar rovers
- Mars habitats
- Mars rovers

The comparisons are exploratory and depend on the assumptions provided by the platform.

### 7. Flame Visual
An interactive way to explore flame behavior and combustion concepts.

Visualizations are intended to support scientific understanding. Illustrative animations should not be interpreted as actual experimental telemetry or validated physical simulations.

### 8. Historical VR Explorer
A separate immersive experience exploring three important spacecraft fire-related events:

- Apollo 1
- Apollo 13
- Mir

The experience uses 3D environments and interactive exploration to help users understand the historical context of these incidents.

## 🔬 Scientific Foundation

FlameFrags is built around the study of combustion in microgravity and the importance of fire safety during human space exploration.

Its research direction draws on NASA's **Physical Sciences Informatics (PSI)** investigations and related space-combustion research.

The platform aims to help users:

1. Explore available experimental information.
2. Compare different investigations.
3. Interpret measurements and relationships.
4. Identify limitations in existing research.
5. Connect scientific findings to future exploration environments.

### Scientific integrity

FlameFrags distinguishes between:

- Experimental measurements.
- Published investigation metadata.
- User-uploaded information.
- Calculated analytical results.
- AI-generated interpretations.
- Illustrative visualizations.

Not every investigation contains every measurement or metadata field. Missing or unverified information should not be treated as confirmed scientific evidence.

## 🛰️ Why It Matters

Understanding combustion beyond Earth is relevant to the future of human space exploration.

Research into flame behavior can contribute to better understanding of:

- Fire behavior in microgravity.
- Combustion characteristics in different environments.
- Spacecraft fire detection and safety.
- Potential research requirements for lunar and Martian habitats.

FlameFrags aims to make these complex research areas easier to explore through an integrated scientific interface.

## 🛠️ Technology

The project uses a modern web-development stack, including:

- **React** — user interface.
- **TypeScript** — application logic and type safety.
- **Vite** — development and build tooling.
- **Three.js** — 3D visualization.
- **Express** — backend services.
- **Gemini API** — AI-assisted functionality.

Additional libraries and services may be used by individual modules.

## 💻 Getting Started

### Prerequisites

- Node.js
- npm
- A compatible web browser
- Gemini API key for AI functionality, where configured

### Installation

Clone the repository:

```bash
git clone https://github.com/itsyacoolda/FLAMEFRAGS-the-fire.git
```

Enter the project directory:

```bash
cd FLAMEFRAGS-the-fire
```

Install dependencies:

```bash
npm install
```

Start the development server using the development command configured in the project's `package.json`.

> Backend services and AI functionality may require additional configuration. Refer to the project's environment configuration and setup instructions.

## 📁 Project Structure

FlameFrags is organized into separate application modules and supporting services.

Major areas include:

- Dashboard and navigation
- AI research assistant
- Data ingestion and analysis
- Combustion research modules
- Scientific visualization
- Habitat relevance analysis
- Historical VR experience
- Backend services

The exact directory structure may change as development continues.

## ⚠️ Limitations

FlameFrags is an exploratory research and educational platform.

- It is not an official NASA application.
- NASA research references do not imply NASA endorsement.
- Built-in datasets may contain selected samples rather than complete experimental archives.
- Uploaded data quality depends on the source and format.
- AI-generated interpretations require independent verification.
- Illustrative visualizations are not substitutes for validated combustion simulations.
- Habitat comparisons depend on stated assumptions and available evidence.

## 👥 Team

**FlameFrags**

Created for the NASA Space Apps Challenge 2026.

## 📜 Disclaimer

FlameFrags is an independent student-developed project created for scientific exploration and education. NASA names, research references, and publicly available scientific information are used for informational purposes. The project is not affiliated with, sponsored by, or endorsed by NASA.

---

**Explore the science. Understand the flame. Prepare for the next frontier.**

🔥 **FlameFrags**
