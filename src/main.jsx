import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App.jsx";
import Home from "./pages/Home.jsx";
import PuzzlePage from "./pages/PuzzlePage.jsx";
import PuzzleCreator from "./pages/PuzzleCreator.jsx";
import Explore from "./pages/Explore.jsx";
import "./index.css";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Home /> },
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