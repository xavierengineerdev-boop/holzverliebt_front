import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [screenWidth, setScreenWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1440)
  const [expandedFAQ, setExpandedFAQ] = useState(null)
  const [products, setProducts] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [showOrderForm, setShowOrderForm] = useState(false)
  const [showOrderSuccess, setShowOrderSuccess] = useState(false)
  const [orderData, setOrderData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '+',
    address: '',
    building: '',
    apartment: '',
    city: '',
    country: 'Poland',
    zipCode: '',
    notes: '',
    quantity: 1,
    paymentMethod: 'bank_transfer',
    deliveryMethod: 'courier'
  })

  // Загружаем товары из API
  useEffect(() => {
    const fetchProducts = async () => {
      const urls = [
        'http://localhost:3001/api/products',
        'http://localhost:3000/api/products',
        '/api/products'
      ];

      let result = null;
      for (const url of urls) {
        try {
          const resp = await fetch(url, { cache: 'no-store' });
          if (!resp.ok) continue;
          result = await resp.json();
          if (result && result.data && Array.isArray(result.data)) {
                setProducts(result.data);
                // Prefer specific SKUs first (SNACK-001), then sensory panels, then Derila, then fallback to first
                const preferred = result.data.find(p => p.sku === 'SNACK-001')
                  || result.data.find(p => /sensory|sinnesp/i.test(p.name))
                  || result.data.find(p => /derila/i.test(p.name))
                  || result.data[0];
                setSelectedProduct(preferred);
                break;
          }
        } catch (e) {
          // try next URL
          continue;
        }
      }

      if (!result) {
        setError('Failed to load products from backend (tried ports 3001 and 3000).');
      }

      setLoading(false);
    }

    fetchProducts()
  }, [])

  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const faqItems = [
    {
      id: 1,
      question: 'Was ist der HOLZVERLIEBT CouchButler und wofür ist er gedacht?',
      answer: 'Der CouchButler ist eine personalisierte Sofa-Bar bzw. Snack-Box für gemütliche Abende. Er bietet Platz für Snacks, Getränke und kleine Alltagsdinge wie Fernbedienung, Taschentücher oder Smartphone – ideal für Abende zu zweit oder mit Freunden.'
    },
    {
      id: 2,
      question: 'Welche Funktionen und Fächer sind enthalten?',
      answer: 'Der CouchButler ist bestens für Ordnung am Abend ausgestattet. Er enthält zwei hochwertige Edelstahlschüsseln für Snacks wie Chips oder Nüsse sowie passende Korkdeckel, die den Inhalt frisch halten. Zusätzlich gibt es spezielle Halterungen für Getränke und praktische Fächer für Alltagsgegenstände wie Fernbedienung, Taschentücher oder dein Smartphone.'
    },
    {
      id: 3,
      question: 'Wie groß ist die Sofa-Bar und passen auch größere Gläser hinein?',
      answer: 'Die Sofa-Bar hat die kompakten Maße von 40 x 27 x 7,5 cm und bietet damit eine stabile Unterlage auf Polstermöbeln. Die Getränkehalter sind so konzipiert, dass sie Standardgläser, Tassen и Flaschen sicher aufnehmen. Bei extrem breiten Gläsern oder bauchigen Weingläsern empfiehlt es sich, den Durchmesser kurz mit den Aussparungen abzugleichen.'
    },
    {
      id: 4,
      question: 'Was ist die Hauptbesonderheit – und was sollte ich beachten?',
      answer: 'Die Besonderheit liegt in der Kombination aus natürlichem Bambus, edlem Kork und robustem Metall – ein stilvoller Blickfang für jedes Wohnzimmer. Zu beachten ist, dass die Edelstahlschüsseln zwar spülmaschinenfest sind, das Bambusgestell jedoch nur feucht abgewischt werden sollte, um die natürliche Holzstruktur langfristig zu schützen.'
    }
  ]

  const toggleFAQ = (id) => {
    setExpandedFAQ(expandedFAQ === id ? null : id)
  }

  const handleQuantityChange = (value) => {
    const newQty = parseInt(value) || 1
    if (newQty > 0) {
      setQuantity(newQty)
    }
  }

  const handleQuantityIncrease = () => {
    setQuantity(quantity + 1)
  }

  const handleQuantityDecrease = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1)
    }
  }

  const handleBuyClick = () => {
    if (products.length === 0) return
    const prod = selectedProduct || (products && products[0])
    setOrderData(prev => ({
      ...prev,
      quantity: quantity,
      productId: prod?._id,
      productName: prod?.name,
      totalPrice: prod?.price?.current * quantity
    }))
    try {
      const prod = selectedProduct || (products && products[0])
      const productId = prod && (prod._id || prod.id) ? (prod._id || prod.id) : null;
      const cartItem = {
        product: productId,
        id: productId,
        _id: productId,
        title: prod?.name,
        price: prod?.price?.current,
        quantity: quantity
      };
      localStorage.setItem('cart', JSON.stringify([cartItem]));
      localStorage.setItem('checkoutPrice', (prod?.price?.current * quantity).toFixed(2));
      localStorage.setItem('checkoutCurrency', (prod?.price?.currency || 'zł'));
      localStorage.setItem('productName', prod?.name || '');
    } catch (err) {
      console.warn('Failed to prefill cart in localStorage', err);
    }
    setShowOrderForm(true)
  }

  const handleOrderSubmit = async (e) => {
    e.preventDefault()
    // Сохраняем данные клиента и адрес в localStorage и перенаправляем на страницу оплаты (Stripe)
    try {
      const fullName = `${orderData.firstName || ''} ${orderData.lastName || ''}`.trim();
      localStorage.setItem('customerName', fullName);
      localStorage.setItem('customerEmail', orderData.email || '');
      localStorage.setItem('customerPhone', orderData.phone || '');
      localStorage.setItem('customerAddress', orderData.address || '');
      localStorage.setItem('customerCity', orderData.city || '');
      // Сохраняем сумму и название продукта для отображения на странице оплаты
      const prod = selectedProduct || (products && products[0])
      const price = prod && prod.price ? prod.price.current.toFixed(2) : '0.00';
      const productName = prod && prod.name ? prod.name : '';
      localStorage.setItem('checkoutPrice', price);
      const currency = prod && prod.price ? prod.price.currency : 'zł';
      localStorage.setItem('checkoutCurrency', currency || 'zł');
      localStorage.setItem('productName', productName);

      // Store cart items so the stripe page can read them (use selectedProduct)
      try {
        const productId = prod && (prod._id || prod.id) ? (prod._id || prod.id) : null;
        const cartItem = {
          product: productId,
          id: productId,
          _id: productId,
          title: productName,
          price: parseFloat(price),
          quantity: quantity
        };
        localStorage.setItem('cart', JSON.stringify([cartItem]));
      } catch (err) {
        // Non-fatal; continue
        console.warn('Failed to set cart in localStorage', err);
      }

      // Перенаправляем на страницу оплаты
      window.location.href = '/src/stripe/index.html';
    } catch (err) {
      alert('❌ Ошибка при подготовке к оплате: ' + err.message)
    }
  }

  // Страница благодарности после заказа
  if (showOrderSuccess) {
    return (
      <div className="app">
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #008F51 0%, #006839 100%)',
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '60px 40px',
            textAlign: 'center',
            maxWidth: '500px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{
              fontSize: '72px',
              marginBottom: '20px'
            }}>✅</div>
            
            <h1 style={{
              color: '#008F51',
              fontSize: '32px',
              margin: '0 0 20px 0',
              fontFamily: 'Arial, sans-serif'
            }}>Twoje zamówienie przyjęte!</h1>
            
            <p style={{
              fontSize: '16px',
              color: '#666',
              marginBottom: '20px',
              lineHeight: '1.6'
            }}>Dziękujemy za Twoje zamówienie! Wkrótce skontaktujemy się z Tobą w celu potwierdzenia szczegółów dostawy.</p>
            
            <p style={{
              fontSize: '14px',
              color: '#999',
              marginBottom: '40px'
            }}>Numer zamówienia zostanie wysłany na Twój email.</p>
            
            <button 
              onClick={() => {
                setShowOrderSuccess(false)
                setQuantity(1)
              }}
              style={{
                padding: '14px 40px',
                background: '#008F51',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'background 0.3s'
              }}
              onMouseOver={(e) => e.target.style.background = '#006839'}
              onMouseOut={(e) => e.target.style.background = '#008F51'}
            >
              Powrót do sklepu
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="header">
        <img 
          src="/assets/logo/logo.svg"
          alt="Logo"
          className="logo"
        />
        <nav className="nav">
          <a href="#Produkt" className="nav-link">Produkt</a>
          <a href="#Eigenschaften" className="nav-link">Eigenschaften</a>
          <a href="#Opinie" className="nav-link">Opinie</a>
          <a href="#FAQ" className="nav-link">FAQ</a>
        </nav>
      </header>
      
      <main className="main">
        <div className="hero">
          <img 
            src="/assets/icons/Grd.svg"
            alt="Gradient"
            className="gradient-bg"
          />
          <img 
            src="/assets/icons/Pod-1.svg"
            alt="Pod"
            className="pod-image"
          />
          <div className="product-title" id="Produkt">
          <h2>
              {selectedProduct && selectedProduct.name ? (
                    selectedProduct.name
                  ) : (products.length > 0 && products[0].name ? products[0].name : (
                <>
                  Sinnespaneele mit Himmelsmotiven 
                  <br className="desktop-br" /> {/* Добавляем управляемый перенос */}
                  Großes 6-teiliges Aktivitätsbrett für Kinder
                </>
                  ))}
            </h2>
            <div className="rating">
              <img src="/assets/icons/Star.svg" alt="Star" className="star" />
              <img src="/assets/icons/Star.svg" alt="Star" className="star" />
              <img src="/assets/icons/Star.svg" alt="Star" className="star" />
              <img src="/assets/icons/Star.svg" alt="Star" className="star" />
              <img src="/assets/icons/Star.svg" alt="Star" className="star" />
              <span className="rating-text">({selectedProduct ? (selectedProduct.reviewsCount !== undefined ? selectedProduct.reviewsCount : 22) : (products.length > 0 ? (products[0].reviewsCount !== undefined ? products[0].reviewsCount : 22) : 22)})</span>
            </div>
            <div className="price-row">
              <div className="price-current">{selectedProduct ? (selectedProduct.price.current * quantity).toFixed(2) : (products.length > 0 ? (products[0].price.current * quantity).toFixed(2) : '409.99')} {selectedProduct ? selectedProduct.price.currency : (products.length > 0 ? products[0].price.currency : 'zł')}</div>
              <div className="price-old">{selectedProduct ? (selectedProduct.price.old * quantity).toFixed(2) : (products.length > 0 ? (products[0].price.old * quantity).toFixed(2) : '829.99')} {selectedProduct ? selectedProduct.price.currency : (products.length > 0 ? products[0].price.currency : 'zł')}</div>
            </div>
            <div className="delivery">Kostenloser Versand</div>
            <button className="btn-add" onClick={handleBuyClick}>In den Warenkorb legen</button>
          </div>
          <img src="/assets/icons/Preview-1.svg" alt="Preview 1" className="preview preview-1" />
          <img src="/assets/icons/Preview-2.svg" alt="Preview 2" className="preview preview-2" />
          <img src="/assets/icons/Preview-3.svg" alt="Preview 3" className="preview preview-3" />
          <img src="/assets/icons/Preview-4.svg" alt="Preview 4" className="preview preview-4" />
        </div>
        
        <div className="features-section">
          <h2 className="features-title">Besonderheiten</h2>
          
{/* Конец блока перед таблицей */}
        <div className="features-table-container" id="Eigenschaften">
          <table className="features-table">
            <thead>
              <tr>
                <th>Eigenschaft</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Materialien</td>
                <td>Bambus, Metall, Kork</td>
              </tr>
              <tr>
                <td>Abmessungen</td>
                <td>40 x 27 x 7,5 cm</td>
              </tr>
              <tr>
                <td>Montageart</td>
                <td>Wandmontage / Freistehend</td>
              </tr>
              <tr>
                <td>Satz (Lieferumfang)</td>
                <td>Das Paket beinhaltet zwei Edelstahlschüsseln und Korkdeckel</td>
              </tr>
              <tr>
                <td>Pflegehinweis</td>
                <td>Schüsseln spülmaschinenfest / Gestell feucht abwischen</td>
              </tr>
            </tbody>
          </table>
        </div> 
      </div> 

        <div className="reviews-section" id="Opinie">
          <h2 className="reviews-title">Was Kunden sagen</h2>
          
          <div className="reviews-container">
            <div className="review-card">
              <div className="review-stars">
                <img src="/assets/icons/Star.svg" alt="Star" className="review-star" />
                <img src="/assets/icons/Star.svg" alt="Star" className="review-star" />
                <img src="/assets/icons/Star.svg" alt="Star" className="review-star" />
                <img src="/assets/icons/Star.svg" alt="Star" className="review-star" />
                <img src="/assets/icons/Star.svg" alt="Star" className="review-star" />
              </div>
              <p className="review-text">Der Artikel hat die Erwartungen voll erfüllt. Gutes Preis- leistungsverhältnis</p>
              <h4 className="review-name">Nina</h4>
              <p className="review-title">02 july 2025 (16:16)</p>
            </div>

            <div className="review-card">
              <div className="review-stars">
                <img src="/assets/icons/Star.svg" alt="Star" className="review-star" />
                <img src="/assets/icons/Star.svg" alt="Star" className="review-star" />
                <img src="/assets/icons/Star.svg" alt="Star" className="review-star" />
                <img src="/assets/icons/Star.svg" alt="Star" className="review-star" />
                <img src="/assets/icons/Star.svg" alt="Star" className="review-star" />
              </div>
              <p className="review-text">Sehr schön hab es verschenkt,kam sehr gut an</p>
              <h4 className="review-name">Dylan</h4>
              <p className="review-title">18 december 2025 (23:11)</p>
            </div>

            <div className="review-card">
              <div className="review-stars">
                <img src="/assets/icons/Star.svg" alt="Star" className="review-star" />
                <img src="/assets/icons/Star.svg" alt="Star" className="review-star" />
                <img src="/assets/icons/Star.svg" alt="Star" className="review-star" />
                <img src="/assets/icons/Star.svg" alt="Star" className="review-star" />
                <img src="/assets/icons/Star.svg" alt="Star" className="review-star" />
              </div>
              <p className="review-text">Superschön, tolle Qualität und mit Liebe versandt. Vielen Dank.</p>
              <h4 className="review-name">Emma</h4>
              <p className="review-title">03 december 2025 (11:55)</p>
            </div>
                        <div className="review-card">
              <div className="review-stars">
                <img src="/assets/icons/Star.svg" alt="Star" className="review-star" />
                <img src="/assets/icons/Star.svg" alt="Star" className="review-star" />
                <img src="/assets/icons/Star.svg" alt="Star" className="review-star" />
                <img src="/assets/icons/Star.svg" alt="Star" className="review-star" />
                <img src="/assets/icons/Star.svg" alt="Star" className="review-star" />
              </div>
              <p className="review-text">Praktisch und stilvoll zugleich. Die Schüsseln sind hochwertig und der CouchButler steht sehr stabil auf unserem Sofa.</p>
              <h4 className="review-name">Noah</h4>
              <p className="review-title">05 december 2025 (21:45)</p>
            </div>
            
            <div className="review-card">
              <div className="review-stars">
                <img src="/assets/icons/Star.svg" alt="Star" className="review-star" />
                <img src="/assets/icons/Star.svg" alt="Star" className="review-star" />
                <img src="/assets/icons/Star.svg" alt="Star" className="review-star" />
                <img src="/assets/icons/Star.svg" alt="Star" className="review-star" />
                <img src="/assets/icons/Star.svg" alt="Star" className="review-star" />
              </div>
              <p className="review-text">Edler Bambus, tadellose Verarbeitung. Schneller Versand. Top!</p>
              <h4 className="review-name">Lucas</h4>
              <p className="review-title">08 january 2026 (22:50)</p>
            </div>
          </div>
        </div>

        <div className="footer-showcase">
          <div className="footer-content">
            <div className="footer-info">
              <h3 className="footer-title">Eine Snackbar</h3>
              <p className="footer-subtitle">für gemütliche Abende</p>
            </div>
            <div className="footer-pricing">
              <div className="footer-price-current">{selectedProduct ? (selectedProduct.price.current * quantity).toFixed(2) : (products.length > 0 ? (products[0].price.current * quantity).toFixed(2) : '409.99')} {selectedProduct ? selectedProduct.price.currency : (products.length > 0 ? products[0].price.currency : 'zł')}</div>
              <div className="footer-price-old">{selectedProduct ? (selectedProduct.price.old * quantity).toFixed(2) : (products.length > 0 ? (products[0].price.old * quantity).toFixed(2) : '829.99')} {selectedProduct ? selectedProduct.price.currency : (products.length > 0 ? products[0].price.currency : 'zł')}</div>
            </div>
            <div className="footer-quantity">
              <button className="qty-btn" onClick={handleQuantityDecrease}>−</button>
              <input 
                type="number" 
                value={quantity} 
                onChange={(e) => handleQuantityChange(e.target.value)}
                className="qty-input" 
                min="1"
              />
              <button className="qty-btn" onClick={handleQuantityIncrease}>+</button>
            </div>
            <button className="footer-btn-add" onClick={handleBuyClick}>In den Warenkorb legen</button>
            <div className="footer-trust">
              <div className="trust-item">
                <img src="/assets/icons/Security.svg" alt="Security" className="trust-icon" />
                <span className="trust-text">Sichere Zahlung über<br />SSL-Protokoll</span>
              </div>
              <div className="trust-item">
                <img src="/assets/icons/Lock.svg" alt="Lock" className="trust-icon" />
                <span className="trust-text">Vertraulichkeitsgarantie</span>
              </div>
            </div>
          </div>
        </div>

        <div className="faq-section" id="FAQ">
          <h2 className="faq-title">Häufig gestellte Fragen</h2>
          
          <div className="faq-container">
            {faqItems.map((item) => (
              <div 
                key={item.id} 
                className={`faq-item ${expandedFAQ === item.id ? 'expanded' : ''}`}
                onClick={() => toggleFAQ(item.id)}
              >
                <div className="faq-header">
                  <h3 className="faq-question">{item.question}</h3>
                  <img 
                    src="/assets/icons/Alt-Arrow.svg" 
                    alt="Toggle" 
                    className="faq-arrow" 
                  />
                </div>
                {expandedFAQ === item.id && (
                  <div className="faq-answer">{item.answer}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="footer">
        <div className="footer-main">
          <div className="footer-left">
            <img src="/assets/logo/logo.svg" alt="Logo" className="footer-logo" />
            <p className="footer-description">
              Schenken Sie Ihrem Kind ein gemütliches und faszinierendes Erlebnis mit unseren personalisierbaren CouchButler-Sofa-Bars von HOLZVERLIEBT. Dieses stilvolle Accessoire sorgt für Ordnung und Komfort auf dem Sofa: Snacks, Getränke und wichtige Kleinigkeiten wie Fernbedienung oder Smartphone sind immer griffbereit – perfekt für entspannte Abende allein, zu zweit oder mit Freunden.
            </p>
          </div>

          <div className="footer-links">
            <h4 className="footer-links-title">Szybki dostęp</h4>
            <ul className="footer-nav">
              <li><a href="#Produkt" className="footer-link">Produkt</a></li>
              <li><a href="#Eigenschaften" className="footer-link">Eigenschaften</a></li>
              <li><a href="#Opinie" className="footer-link">Opinie</a></li>
              <li><a href="#FAQ" className="footer-link">FAQ</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-divider"></div>

        <div className="footer-bottom">
          <p className="footer-copyright">© 2026 PilloSettle. Wszelkie prawa zastrzeżone. Stworzone z myślą o Twoim najlepszym śnie.</p>
        </div>
      </footer>

      {/* Модальное окно формы заказа */}
      {showOrderForm && (
        <div className="order-modal-overlay" onClick={() => setShowOrderForm(false)}>
          <div className="order-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowOrderForm(false)}>✕</button>
            <h2>Potwierdzenie zamówienia</h2>
            <form onSubmit={handleOrderSubmit} className="order-form">
              <div className="form-group">
                <label>Imię *</label>
                <input 
                  type="text" 
                  required 
                  value={orderData.firstName}
                  onChange={(e) => setOrderData({...orderData, firstName: e.target.value})}
                  placeholder="Twoje imię"
                />
              </div>

              <div className="form-group">
                <label>Nazwisko *</label>
                <input 
                  type="text" 
                  required 
                  value={orderData.lastName}
                  onChange={(e) => setOrderData({...orderData, lastName: e.target.value})}
                  placeholder="Twoje nazwisko"
                />
              </div>

              <div className="form-group">
                <label>Email *</label>
                <input 
                  type="email" 
                  required 
                  value={orderData.email}
                  onChange={(e) => setOrderData({...orderData, email: e.target.value})}
                  placeholder="your@email.com"
                />
              </div>

              <div className="form-group">
                <label>Telefon *</label>
                <input 
                  type="tel" 
                  required 
                  value={orderData.phone}
                  onChange={(e) => setOrderData({...orderData, phone: e.target.value})}
                  placeholder="+49 123 456 789"
                />
              </div>

              <div className="form-group">
                <label>Adres *</label>
                <input 
                  type="text" 
                  required 
                  value={orderData.address}
                  onChange={(e) => setOrderData({...orderData, address: e.target.value})}
                  placeholder="Ulica i numer domu"
                />
              </div>

              <div className="form-group">
                <label>Miasto *</label>
                <input 
                  type="text" 
                  required 
                  value={orderData.city}
                  onChange={(e) => setOrderData({...orderData, city: e.target.value})}
                  placeholder="Twoje miasto"
                />
              </div>

              <div className="form-group">
                <label>Kod pocztowy *</label>
                <input 
                  type="text" 
                  required 
                  value={orderData.zipCode}
                  onChange={(e) => setOrderData({...orderData, zipCode: e.target.value})}
                  placeholder="00-000"
                />
              </div>

              <div className="form-summary">
                <p>Produkt: {selectedProduct ? selectedProduct.name : (products.length > 0 ? products[0].name : 'N/A')}</p>
                <p>Ilość: {quantity}</p>
                <p className="total-price">Razem: {selectedProduct ? (selectedProduct.price.current * quantity).toFixed(2) : (products.length > 0 ? (products[0].price.current * quantity).toFixed(2) : '0')} {selectedProduct ? selectedProduct.price.currency : (products.length > 0 ? products[0].price.currency : 'zł')}</p>
              </div>

              <button type="submit" className="btn-submit">Potwierdź zamówienie</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App

