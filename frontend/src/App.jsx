import { Routes, Route } from "react-router-dom";
import NavBar from "./components/NavBar";
import DraftBoard from "./pages/DraftBoard";
import CurveComparison from "./pages/CurveComparison";
import RedraftSimulator from "./pages/RedraftSimulator";
import Analyst from "./pages/Analyst";
import GMScorecard from "./pages/GMScorecard";
import Methodology from "./pages/Methodology";

export default function App() {
  return (
    <>
      <NavBar />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<DraftBoard />} />
          <Route path="/curve" element={<CurveComparison />} />
          <Route path="/redraft" element={<RedraftSimulator />} />
          <Route path="/analyst" element={<Analyst />} />
          <Route path="/teams" element={<GMScorecard />} />
          <Route path="/methodology" element={<Methodology />} />
        </Routes>
      </main>
    </>
  );
}
