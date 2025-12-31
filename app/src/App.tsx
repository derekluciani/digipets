import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { StartScreen } from "./components/screens/StartScreen";
import { NewPetScreen } from "./components/screens/NewPetScreen";
import { GameScreen } from "./components/screens/GameScreen";
import { DeathScreen } from "./components/screens/DeathScreen";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StartScreen />} />
        <Route path="/new" element={<NewPetScreen />} />
        <Route path="/game" element={<GameScreen />} />
        <Route path="/death" element={<DeathScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
