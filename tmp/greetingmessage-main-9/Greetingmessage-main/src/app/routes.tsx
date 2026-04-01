import { createBrowserRouter } from "react-router";
import Layout from "./layout";
import Overview from "./pages/Overview";
import Colors from "./pages/Colors";
import Typography from "./pages/Typography";
import Spacing from "./pages/Spacing";
import Buttons from "./pages/Buttons";
import Forms from "./pages/Forms";
import Components from "./pages/Components";
import Icons from "./pages/Icons";
import LayoutPage from "./pages/LayoutPage";
import Logos from "./pages/Logos";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Overview },
      { path: "logos", Component: Logos },
      { path: "colors", Component: Colors },
      { path: "typography", Component: Typography },
      { path: "spacing", Component: Spacing },
      { path: "buttons", Component: Buttons },
      { path: "forms", Component: Forms },
      { path: "components", Component: Components },
      { path: "icons", Component: Icons },
      { path: "layout", Component: LayoutPage },
    ],
  },
]);