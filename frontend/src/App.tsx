import NavBar from "./components/NavBar";
import 'bootstrap/dist/css/bootstrap.css';
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import imagePath from "./assets/placeholder-img.png";
function App() {
  let items = ["Analytics", "Incidents", "Settings"];
  return (
    <div>
      <NavBar //name img and items passed as parameters
        brandName="Dashboard"
        imageSrcPath={imagePath}
        navItems={items} />
    </div>
  )
}

export default App