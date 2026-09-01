# PreHaRM Clinical Surveillance & Harm Prevention Dashboard (v0.1 FHIR R4)

An interactive, containerized Clinical Decision Support (CDS) and surveillance dashboard for proactive hospital harm prevention across three critical domains: **In-Hospital Falls**, **Medication Administration Safety**, and **Patient Aggression / Violence ("Code Black")**.

Plugs into the **Electronic Medical Record (EMR)** schema and standardizes data streams into **HL7 FHIR R4** resources (`Patient`, `Encounter`, `Observation`, and `RiskAssessment`) with direct interoperability to public FHIR test sandboxes.

---

## Key Clinical Features

- **Spatial Bed & Transit Tracking:** Real-time visual floorplan monitoring physical bed occupancy and unmonitored intra-hospital transit intervals (e.g., transfers to Radiology / CT or Theatres) as dynamic risk multipliers.
- **Explainable AI (XAI) Contributing Drivers:** Decomposes opaque risk percentiles into explicit, human-interpretable clinical drivers (e.g., *Advanced Age*, *Fall-Risk-Increasing Drugs (FRIDs) Exposure*, *Acute Delirium*, *Admission Reconciliation Window*).
- **Closed-Loop Action Bundles:** Real-time risk recalculation as clinical mitigations (e.g., *Bed Guards*, *Assist Toilet*, *1:1 Special Observation*) are toggled by nursing staff.
- **Clinician Override Audit Logging:** Allows clinical judgment overrides with logged rationale and immediate visual status updates.
- **Role-Tailored Workflows:**
  - **Ward Display:** Optimized for bedside nursing situational awareness with an interactive SVG floorplan and risk grid.
  - **NUM Overview:** Strategic oversight featuring a **7-Day Shift Risk Forecast Matrix** (Morning, Afternoon, Night), active staff skill-mix metrics, and bed incompatibility/transfer recommendations.
- **Live HL7 FHIR R4 Interoperability:** Generates and validates standard FHIR `RiskAssessment` resources with live `POST` submission capabilities to the public **HAPI FHIR R4 Test Server** (`https://hapi.fhir.org/baseR4`).

---

## EMR (CPM Schema) Data Integration Mapping

The platform extracts structured clinical data from the Sunrise Clinical Performance Management (CPM) database tables:

| Clinical Domain | Sunrise EMR Source Table | Target Fields | FHIR R4 Resource Equivalent |
| :--- | :--- | :--- | :--- |
| **Demographics & Visit** | `SCAPatientDim`, `SCAVisit` | `MRN`, `BirthDtm`, `Gender`, `AdmitDtm`, `DischargeDtm` | `Patient`, `Encounter` |
| **Physical Location & Flow** | `SCAVisitLocation`, `SCALocationDim` | `LocationDimID`, `TransferRequestDtm`, `MinutesInLocation`, `BedStatus` | `Encounter.location` |
| **Falls Risk Assessments** | `SCAObservation`, `SCAObsCatalogNameDim` | `ObsValue`, `ObsText` (Morse Scale, STRATIFY, Mobility, Gait) | `Observation`, `RiskAssessment` |
| **Medication Safety** | `SCAMedicationCharting`, `SCAMedChartingAdminWarning` | `MedName`, `IsPRN`, `PerformedDtm`, `WarningText`, `OverrideReason` | `MedicationAdministration`, `RiskAssessment` |
| **Violence / Code Black** | `SCAObservation`, `SCADiagnosis`, `SCAClinDecSupport` | `DiagCode` (Delirium/Withdrawal), `AlertName`, BVC/RASS Scores | `Observation`, `Condition`, `RiskAssessment` |
| **Action Mitigations** | `SCAOrder`, `SCAOrderTaskCharting` | `OrderTypeDimID`, `OrderTaskChartingID`, `PerformedDtm` | `CarePlan`, `ServiceRequest` |

---

## Technical Stack & Architecture

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons
- **Interoperability Standard:** HL7 FHIR R4 (SNOMED CT, LOINC, RxNorm)
- **Deployment:** GitHub Pages (Automated CI/CD via GitHub Actions)
- **Backend / Live FHIR Endpoint:** HAPI FHIR R4 Public Test Server (`https://hapi.fhir.org/baseR4`)

---

## Local Development Setup

If you want to run or modify this project locally:

```bash
# 1. Clone the repository
git clone [https://github.com/](https://github.com/)<your-github-username>/preharm-clinical-dashboard.git
cd preharm-clinical-dashboard

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
