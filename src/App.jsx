import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Reports from './pages/Reports';
import Courses from './pages/Courses';
import FreeCalculators from './pages/FreeCalculators';
import Dasha from './pages/Dasha';
import DoshCheck from './pages/DoshCheck';
import Charts from './pages/Charts';
import LalKitab from './pages/LalKitab';
import KPAstrology from './pages/KPAstrology';
import Tarot from './pages/Tarot';
import Chat from './pages/Chat';
import Admin from './pages/Admin';
import SubmitBlog from './pages/SubmitBlog';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Booking from './pages/Booking';
import MyBookings from './pages/MyBookings';
import AboutUs from './pages/AboutUs';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsConditions from './pages/TermsConditions';
import RefundPolicy from './pages/RefundPolicy';
import RequireAdmin from './components/RequireAdmin';
import Blogs from './pages/Blogs';

function App() {
  return (
    <Router>
      <div className="page-wrapper">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/blogs" element={<Blogs />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/calculators" element={<FreeCalculators />} />
            <Route path="/dasha" element={<Dasha />} />
            <Route path="/dosh-check" element={<DoshCheck />} />
            <Route path="/charts" element={<Charts />} />
            <Route path="/lal-kitab" element={<LalKitab />} />
            <Route path="/kp-astrology" element={<KPAstrology />} />
            <Route path="/tarot" element={<Tarot />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/admin" element={<RequireAdmin><Admin /></RequireAdmin>} />
            <Route path="/write-experience" element={<SubmitBlog />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/booking" element={<Booking />} />
            <Route path="/my-bookings" element={<MyBookings />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsConditions />} />
            <Route path="/refund" element={<RefundPolicy />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;

