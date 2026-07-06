import { useState } from "react";
import "../App.css"
interface NavBarProps { //sets parameters to pass the name and image from the app.tsx file
    brandName: string;
    imageSrcPath: string;
    navItems: string[];
}

function NavBar({ brandName, imageSrcPath, navItems }: NavBarProps) { // creates the nav bar component with colours, img and name icons
    const [selectedIndex, setSelectedIndex] = useState(-1);
    return (
        <nav className="navbar navbar-expand-md navbar-light bg-white shadow">
            <div className="container-fluid">
                <a className="navbar-brand" href="#">
                    <img
                        src={imageSrcPath}
                        width="60"
                        height="60"
                        className="d-inline-block align-center"
                        alt=""
                    />
                    <span className="fw-bolder fs-4">{brandName}</span>
                </a>
                <button //creates the icons in the nav bar as buttons
                    className="navbar-toggler"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#navbarSupportedContent"
                    aria-controls="navbarSupportedContent"
                    aria-expanded="false"
                    aria-label="Toggle navigation"
                >
                    <span className="navbar-toggler-icon"></span>
                </button>
                <div
                    className="collapse 
          navbar-collapse
          align-items-start
          flex-column
          flex-md-row"
                    id="navbarSupportedContent"
                >
                    <ul className="navbar-nav me-auto mb-2 mb-md-1">
                        {navItems.map((items, index) =>
                        (
                            <li
                                key={items}
                                className="nav-item"
                                onClick={() => setSelectedIndex(index)}
                            >
                                <a className={
                                    selectedIndex == index
                                        ? "nav-link active fw-bold"
                                        : "nav-link"
                                }
                                    href="#">
                                    {items}
                                </a>
                            </li>
                        ))}
                    </ul>
                    <form className="d-flex me-3" role="search">
                        <input
                            className="form-control me-2"
                            type="search"
                            placeholder="Search"
                            aria-label="Search" />
                        <button
                            className="btn btn-outline-success"
                            type="submit">
                            Search
                        </button>
                    </form>
                </div>
            </div>
        </nav>
    )
}

export default NavBar