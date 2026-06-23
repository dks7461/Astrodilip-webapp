import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Search, X, Calendar, User, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import './Blogs.css';

const Blogs = () => {
  const [blogsData, setBlogsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedBlog, setSelectedBlog] = useState(null);

  const getFallbackImage = (title = '') => {
    const t = title.toLowerCase();
    if (t.includes('planetary') || t.includes('transit')) return '/courses/new-planetary transits.png';
    if (t.includes('vastu')) return '/courses/new-vastu.png';
    if (t.includes('lal kitab') || t.includes('lalkitab')) return '/courses/new-lalkitab.jpg';
    return '/courses/course-vedic.png';
  };

  const getCategory = (title = '', excerpt = '') => {
    const haystack = `${title} ${excerpt}`.toLowerCase();
    if (haystack.includes('vastu')) return 'Vastu Shastra';
    if (haystack.includes('lal kitab') || haystack.includes('lalkitab')) return 'Lal Kitab';
    if (haystack.includes('planetary') || haystack.includes('transit') || haystack.includes('grah') || haystack.includes('kundali') || haystack.includes('vedic')) return 'Vedic Astrology';
    return 'General';
  };

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('blogs')
          .select('*')
          .eq('status', 'published')
          .order('created_at', { ascending: false });

        // Add dummy static ones if table is empty
        const defaultBlogs = [
          {
            id: 'default-1',
            title: "Planetary Transits & Their Impact on Your Life",
            excerpt: "Understand how major planet movements affect your career, relationships, and health, and learn simple remedies to mitigate challenges.\n\nPlanetary transits (Gochara) play an essential role in Vedic Astrology. They refer to the continuous movement of planets through the zodiac signs relative to the positions of the planets at the time of your birth. For instance, Saturn's transit (known as Shani Sade Sati) can bring periods of intense reflection, discipline, and major restructuring in life. \n\nSimilarly, Jupiter's transit is known to bring expansion, wisdom, and good fortune. By understanding these transits, one can align their actions to the planetary energies and seek solutions/remedies such as chanting specific mantras, performing charity, or wearing gemstones recommended by an expert astrologer.",
            display_date: "May 15, 2026",
            author: "Astro Dilip Sharma",
            image: "/courses/new-planetary transits.png",
            status: 'published'
          },
          {
            id: 'default-2',
            title: "Vastu Shastra Tips for Wealth & Prosperity",
            excerpt: "Discover simple changes you can make to your home or office layout to attract positive energy, eliminate financial blocks, and support success.\n\nVastu Shastra is the traditional Indian system of architecture. It translates to 'science of architecture.' Vastu describes principles of design, layout, measurements, ground preparation, space arrangement, and spatial geometry. \n\nTo attract wealth, Vastu highly recommends focusing on the North and Northeast directions of your premises. Ensuring that the Northeast corner is kept clean, uncluttered, and light (with perhaps a water element like a small fountain or water pot) can significantly boost positive energy. The entrance should be well-lit and welcoming, free of garbage or shoe racks directly blocking the pathway. Implementing simple color adjustments (such as using light yellow or green in certain zones) can yield remarkable improvements in your professional and personal endeavors.",
            display_date: "May 12, 2026",
            author: "Astro Dilip Sharma",
            image: "/courses/new-vastu.png",
            status: 'published'
          },
          {
            id: 'default-3',
            title: "Lal Kitab Remedies for Common Life Problems",
            excerpt: "Explore time-tested, practical astrological remedies from the Lal Kitab for career blocks, family harmony, and planetary dosha relief.\n\nLal Kitab is a set of five Urdu language books on Hindu astrology and palmistry, written in the 19th century. What makes Lal Kitab highly popular is its simple, cost-effective, and highly practical remedies (Totkas). Unlike traditional Vedic astrology, Lal Kitab remedies do not necessarily involve expensive Pujas or complex rituals.\n\nInstead, they suggest daily activities like feeding birds, flowing copper coins in running water, offering sweets to animals, or keeping specific items at home. These acts work as powerful karmic adjustments that ease planetary tensions in one's horoscope. For example, feeding bananas to monkeys is often recommended to strengthen Mars, while respect and service to elders strengthen Jupiter. Always consult an expert to determine which remedies correspond accurately to your personal chart placement.",
            display_date: "May 08, 2026",
            author: "Astro Dilip Sharma",
            image: "/courses/new-lalkitab.jpg",
            status: 'published'
          }
        ];

        if (data && data.length > 0) {
          const mapped = data.map((b) => ({
            id: b.id,
            title: b.title,
            excerpt: b.excerpt,
            display_date: b.display_date,
            author: b.author,
            image: b.image || getFallbackImage(b.title),
            status: b.status,
          }));
          // Merge with defaults to ensure we have content
          setBlogsData([...mapped, ...defaultBlogs.filter(d => !mapped.some(m => m.title === d.title))]);
        } else {
          setBlogsData(defaultBlogs);
        }
      } catch (err) {
        console.error('Failed to fetch blogs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBlogs();
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (selectedBlog) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedBlog]);

  const categories = ['All', 'Vedic Astrology', 'Vastu Shastra', 'Lal Kitab', 'General'];

  const filteredBlogs = blogsData.filter((blog) => {
    const matchesSearch = 
      blog.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      blog.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
      blog.author.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeCategory === 'All') return matchesSearch;
    return matchesSearch && getCategory(blog.title, blog.excerpt) === activeCategory;
  });

  return (
    <div className="blogs-page">
      <Helmet>
        <title>Astrology & Vedic Blogs | Astro Dilip Sharma</title>
        <meta name="description" content="Explore Vedic Astrology, Vastu Shastra remedies, and Lal Kitab insights. Read client experiences and guide your path with ancient Vedic wisdom." />
        <link rel="canonical" href="https://astrodilipsharma.com/blogs" />
      </Helmet>

      <div className="container">
        {/* Header */}
        <header className="blogs-page-header">
          <h1 className="blogs-page-title">Vedic Knowledge & Client Blogs</h1>
          <p className="blogs-page-subtitle">
            Ancient cosmic wisdom, Vastu layout advice, and inspiring testimonials from people guided by Mr. Dilip Sharma.
          </p>
        </header>

        {/* Controls: Search & Category Pills */}
        <div className="blogs-controls">
          <div className="blogs-search-wrapper">
            <Search className="blogs-search-icon" size={18} />
            <input
              type="text"
              placeholder="Search articles, remedies or authors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="blogs-search-input"
            />
          </div>

          <div className="blogs-categories">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`category-pill ${activeCategory === cat ? 'active' : ''}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Loading / Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', fontSize: '1.2rem', fontWeight: 'bold' }}>
            Loading Vedic articles...
          </div>
        ) : filteredBlogs.length === 0 ? (
          <div className="blogs-empty-state">
            <h3>No Articles Found</h3>
            <p>We couldn't find any articles matching your filters or search term. Try searching for something else or changing categories!</p>
          </div>
        ) : (
          <div className="blogs-page-grid">
            {filteredBlogs.map((blog) => {
              const cat = getCategory(blog.title, blog.excerpt);
              return (
                <div key={blog.id} className="blog-card" style={{ cursor: 'pointer' }} onClick={() => setSelectedBlog(blog)}>
                  <div className="blog-image-wrapper">
                    <img src={blog.image} alt={blog.title} className="blog-image" />
                  </div>
                  <div className="blog-content">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span className="blog-date">{blog.display_date || blog.date}</span>
                      <span style={{ fontSize: '0.8rem', background: 'rgba(255, 107, 0, 0.1)', color: '#FF6B00', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>{cat}</span>
                    </div>
                    <h3 className="blog-card-title">{blog.title}</h3>
                    <p className="blog-excerpt" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {blog.excerpt}
                    </p>
                    <div className="blog-author" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <span className="author-name">- {blog.author}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.9rem', color: '#FF6B00', fontWeight: 'bold' }}>
                        Read More <ArrowRight size={14} />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* CTA */}
        <div className="blog-cta-wrapper">
          <div className="blog-cta-card">
            <h3>Have an Experience to Share?</h3>
            <p>Write your own blog about how Astro Dilip Sharma's predictions or remedies changed your life.</p>
            <Link to="/write-experience" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              Write Your Experience
            </Link>
          </div>
        </div>
      </div>

      {/* Modal Details View */}
      {selectedBlog && (
        <div className="blog-modal-backdrop" onClick={() => setSelectedBlog(null)}>
          <div className="blog-modal-container" onClick={(e) => e.stopPropagation()}>
            <button className="blog-modal-close-btn" onClick={() => setSelectedBlog(null)}>
              <X size={20} />
            </button>

            <div className="blog-modal-image-wrapper">
              <img src={selectedBlog.image} alt={selectedBlog.title} className="blog-modal-image" />
            </div>

            <div className="blog-modal-body">
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.8rem' }}>
                <span className="blog-modal-date">{selectedBlog.display_date || selectedBlog.date}</span>
                <span style={{ fontSize: '0.85rem', background: 'rgba(255, 107, 0, 0.15)', color: '#FF6B00', padding: '4px 12px', borderRadius: '16px', fontWeight: 'bold' }}>
                  {getCategory(selectedBlog.title, selectedBlog.excerpt)}
                </span>
              </div>

              <h2 className="blog-modal-title">{selectedBlog.title}</h2>
              <div className="blog-modal-content">{selectedBlog.excerpt}</div>

              <div className="blog-modal-footer">
                <span className="blog-modal-author">Written by: {selectedBlog.author}</span>
                <button className="btn-primary" onClick={() => setSelectedBlog(null)}>Close Article</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Blogs;
