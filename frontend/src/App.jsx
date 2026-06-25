import { Routes, Route, useLocation } from "react-router-dom";
import NavBar from "./components/NavBar";
import Landing from "./pages/Landing";
import DraftBoard from "./pages/DraftBoard";
import CurveComparison from "./pages/CurveComparison";
import RedraftSimulator from "./pages/RedraftSimulator";
import Analyst from "./pages/Analyst";
import GMScorecard from "./pages/GMScorecard";
import Methodology from "./pages/Methodology";
import DraftPreview from "./pages/DraftPreview";

export default function App() {
  const location = useLocation();
  const isLanding = location.pathname === "/";

  return (
    <>
      {!isLanding && <NavBar />}
      <main className={isLanding ? undefined : "app-main"}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/board" element={<DraftBoard />} />
          <Route path="/curve" element={<CurveComparison />} />
          <Route path="/redraft" element={<RedraftSimulator />} />
          <Route path="/preview" element={<DraftPreview />} />
          <Route path="/analyst" element={<Analyst />} />
          <Route path="/teams" element={<GMScorecard />} />
          <Route path="/methodology" element={<Methodology />} />
        </Routes>
      </main>
    </>
  );
}
