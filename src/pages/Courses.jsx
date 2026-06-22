import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Star } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import './Courses.css';

const Courses = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('courses')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      setCourses(data || []);
    };
    load();
  }, []);

  // Payments are deferred. Enrolling records interest; the astrologer follows up.
  const handleEnroll = async (course) => {
    if (!user) {
      alert('Please log in to enroll in a course.');
      localStorage.setItem('redirect_after_login', '/courses');
      navigate('/login');
      return;
    }

    const { error } = await supabase.from('course_enrollments').insert({
      user_id: user.id,
      course_id: course.id,
      user_name: profile?.name || user.user_metadata?.name || '',
      user_email: profile?.email || user.email,
      amount: course.price,
      status: 'pending',
      payment_status: 'waived',
    });

    if (error) {
      console.error(error);
      alert('Could not record your enrollment. Please try again.');
    } else {
      alert('Thank you! Your enrollment request has been received. Astro Dilip Sharma will contact you with the next steps.');
    }
  };

  return (
    <div className="courses-page">
      <Helmet>
        <title>Learn Astrology & Vastu | Vedic Courses by Astro Dilip Sharma</title>
        <meta name="description" content="Enroll in expert astrology courses, complete Vastu, Numerology, and Lal Kitab remedies training with Astro Dilip Sharma. Daily batches available." />
        <link rel="canonical" href="https://astrodilipsharma.com/courses" />
      </Helmet>
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
                  <button className="btn-pay" onClick={() => handleEnroll(course)}>Enroll Now</button>
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
