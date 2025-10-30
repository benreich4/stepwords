import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App.jsx";
import Home from "./pages/Home.jsx";
import Archives from "./pages/Archives.jsx";
import PuzzlePage from "./pages/PuzzlePage.jsx";
import PuzzleCreator from "./pages/PuzzleCreator.jsx";
import Explore from "./pages/Explore.jsx";
import QuickToday from "./pages/QuickToday.jsx";
import QuickPage from "./pages/QuickPage.jsx";
import Submissions from "./pages/Submissions.jsx";
import SubmissionPlay from "./pages/SubmissionPlay.jsx";
import Stats from "./pages/Stats.jsx";
import "./index.css";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: "/archives", element: <Archives /> },
      { path: "/quick", element: <QuickToday /> },
      { path: "/quick/:puzzleId", element: <QuickPage /> },
      { path: "/submissions", element: <Submissions /> },
      { path: "/submissions/:sid", element: <SubmissionPlay /> },
      { path: "/stats", element: <Stats /> },
      { path: "/:puzzleId", element: <PuzzlePage /> },
    ],
  },
  {
    path: "/create",
    element: <PuzzleCreator />,
  },
  {
    path: "/explore",
    element: <Explore />,
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);