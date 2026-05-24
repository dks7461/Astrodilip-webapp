import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Star } from 'lucide-react';
import './Courses.css';

const courses = [
  {
    id: 1,
    title: "Be Expert in Future Consultation in All Astrology",
    price: "11,000",
    image: "/courses/course-expert.png",
    description: "In this comprehensive Vedic Astrology course, we provide 6,000 minutes of training divided into 150 classes of 40 minutes each. You can complete this course in 50 to 150 days, depending on how many classes you choose to attend daily. We teach you Vedic astrology, Vastu, Numerology, Lal Kitab, and everything required to become an expert in future consultation. We have 7 batches running daily, so we can manage a batch that fits your schedule."
  },
  {
    id: 2,
    title: "Full Vastu Course",
    price: "7,000",
    image: "/courses/course-vastu.png",
    description: "In this comprehensive Vastu course, we provide 3,600 minutes of training divided into 90 classes of 40 minutes each. You can complete this course in 50 to 90 days, depending on your daily attendance. We teach you complete Vastu Shastra along with all remedial solution techniques to make you an expert in Vastu consultation. We have 7 batches running daily to fit your schedule."
  },
  {
    id: 3,
    title: "Lalkitab Remedies",
    price: "5,000",
    image: "/courses/course-lalkitab.png",
    description: "In this course, we provide 2,400 minutes of training divided into 60 classes of 40 minutes each. You can complete this course sooner by taking multiple classes a day. We teach you complete Lal Kitab predictions, remedies, and everything required to become an expert in future consultation. We have 7 batches running daily to accommodate your schedule."
  },
  {
    id: 4,
    title: "Numerology",
    price: "5,000",
    image: "/courses/course-numerology.png",
    description: "In this course, we provide 2,400 minutes of training divided into 60 classes of 40 minutes each. You can complete this course in 30 to 60 days based on your daily attendance. We teach you complete Numerology and Tarot predictions for all types of queries, making you an expert in future consultation. We have 7 batches running daily to fit your availability."
  },
  {
    id: 5,
    title: "Vedic Astrology",
    price: "5,000",
    image: "/courses/course-vedic.png",
    description: "In this course, we provide 3,600 minutes of training divided into 90 classes of 40 minutes each. You can complete this course in 50 to 90 days, depending on your daily attendance. We teach you comprehensive Vedic Astrology principles and predictive techniques to make you an expert in astrological consultation. We have 7 batches running daily to accommodate your schedule."
  }
];

const Courses = () => {
  const navigate = useNavigate();

  const handlePayment = async (course) => {
    const userStr = localStorage.getItem('astrology_user');
    if (!userStr) {
      alert('Please log in to purchase a course.');
      navigate('/login');
      return;
    }
    const user = JSON.parse(userStr);
    
    // Parse the price string (e.g., "11,000" to 11000)
    const amountStr = course.price.replace(/,/g, '');
    const amountNum = parseInt(amountStr, 10);

    const bookingData = {
      userId: user.id || null,
      userName: user.name || 'User',
      userEmail: user.email || '',
      date: new Date().toLocaleDateString('en-GB'),
      timeSlot: 'N/A',
      duration: 0,
      consultationType: `Course: ${course.title}`,
      amount: amountNum,
      notes: 'Course Admission',
      status: 'confirmed'
    };

    try {
      const orderRes = await fetch('https://astrodilip-webapp.onrender.com/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountNum })
      });
      
      if (!orderRes.ok) {
        return alert('Failed to initiate payment. Please try again.');
      }
      
      const order = await orderRes.json();
      
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "Astro Dilip Sharma",
        description: `Admission: ${course.title}`,
        order_id: order.id,
        handler: async function (response) {
          const verifyRes = await fetch('https://astrodilip-webapp.onrender.com/api/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              bookingData: bookingData
            })
          });
          
          if (verifyRes.ok) {
            alert('Payment successful! Course admission confirmed.');
            navigate('/my-bookings');
          } else {
            alert('Payment verification failed. If money was deducted, please contact support.');
          }
        },
        prefill: {
          name: user.name || '',
          email: user.email || '',
          contact: user.phone || ''
        },
        theme: {
          color: "#FF6B00"
        }
      };

      const rzp1 = new window.Razorpay(options);
      rzp1.on('payment.failed', function (response){
        alert(`Payment Failed: ${response.error.description}`);
      });
      rzp1.open();

    } catch (err) {
      console.error(err);
      alert('An error occurred during payment processing.');
    }
  };

  return (
    <div className="courses-page">
      <div className="courses-header">
        <h1 className="section-title">Diploma Of Expert In Future Consultation Courses</h1>
      </div>

      <div className="courses-grid">
        {courses.map((course) => (
          <div key={course.id} className="course-card">
            <div className="course-image-container">
              {/* Fallback box if image isn't available yet */}
              <img 
                src={course.image} 
                alt={course.title} 
                className="course-img"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              <div className="course-placeholder" style={{ display: 'none' }}>Image Placeholder</div>
            </div>
            
            <div className="course-content">
              <div className="course-top-row">
                <h2 className="course-title">{course.title}</h2>
                <div className="course-price-badge">
                  ₹ {course.price}
                </div>
              </div>
              
              <p className="course-desc">
                {course.description}
              </p>
              
              <div className="course-bottom-row">
                <div className="course-stars">
                  <Star fill="#FFB800" size={32} strokeWidth={1} />
                  <Star fill="#FFB800" size={32} strokeWidth={1} />
                  <Star fill="#FFB800" size={32} strokeWidth={1} />
                  <Star fill="#FFB800" size={32} strokeWidth={1} />
                  <Star fill="#FFB800" size={32} strokeWidth={1} />
                </div>
                
                <div className="course-actions">
                  <button className="btn-pay" onClick={() => handlePayment(course)}>Admission/Pay</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Courses;
