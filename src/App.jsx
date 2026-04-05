import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  ShoppingCart, 
  Refrigerator, 
  ChefHat, 
  AlertTriangle, 
  Calendar,
  CheckCircle2,
  Sparkles,
  Loader2,
  LogOut,
  Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import Auth from './Auth';
import AdminPanel from './AdminPanel';
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  setDoc,
  getDocs,
  query,
  orderBy
} from 'firebase/firestore';

const ADMIN_EMAIL = 'preetikrishnan7@gmail.com';
const LOW_STOCK_ITEMS = ['egg', 'milk'];

function isLowStock(name, quantity) {
  return LOW_STOCK_ITEMS.includes(name.toLowerCase()) && parseFloat(quantity) <= 1;
}

function App() {
  const [user, setUser] = useState(undefined); // undefined = checking, null = logged out
  const [fridgeItems, setFridgeItems] = useState([]);
  const [groceryItems, setGroceryItems] = useState([]);
  const [activeTab, setActiveTab] = useState('fridge');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', quantity: '', type: 'pcs', expiry: '' });
  const [loading, setLoading] = useState(true);

  // Auth state listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u ?? null));
    return unsub;
  }, []);

  // Real-time Firestore listeners (scoped per user)
  useEffect(() => {
    if (!user) {
      setFridgeItems([]);
      setGroceryItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const fridgeCol = collection(db, 'users', user.uid, 'fridgeItems');
    const groceryCol = collection(db, 'users', user.uid, 'groceryItems');

    const unsubFridge = onSnapshot(fridgeCol, (snapshot) => {
      const items = snapshot.docs.map(d => ({ docId: d.id, ...d.data() }));
      setFridgeItems(items);
      setLoading(false);
    });

    const unsubGrocery = onSnapshot(groceryCol, (snapshot) => {
      const items = snapshot.docs.map(d => ({ docId: d.id, ...d.data() }));
      setGroceryItems(items);
    });

    return () => {
      unsubFridge();
      unsubGrocery();
    };
  }, [user]);

  const fridgeCol = () => collection(db, 'users', user.uid, 'fridgeItems');
  const groceryCol = () => collection(db, 'users', user.uid, 'groceryItems');
  const fridgeDoc = (docId) => doc(db, 'users', user.uid, 'fridgeItems', docId);
  const groceryDoc = (docId) => doc(db, 'users', user.uid, 'groceryItems', docId);

  const addItemToFridge = async () => {
    if (!newItem.name) return;

    const existing = fridgeItems.find(item => item.name.toLowerCase() === newItem.name.toLowerCase());

    if (existing) {
      const newQty = parseFloat(existing.quantity || 0) + parseFloat(newItem.quantity || 0);
      const low = isLowStock(existing.name, newQty.toString());
      await updateDoc(fridgeDoc(existing.docId), { quantity: newQty.toString(), lowStock: low });
    } else {
      const low = isLowStock(newItem.name, newItem.quantity);
      await addDoc(fridgeCol(), {
        name: newItem.name,
        quantity: newItem.quantity,
        type: newItem.type,
        expiry: newItem.expiry,
        lowStock: low,
        createdAt: Date.now()
      });
    }

    setNewItem({ name: '', quantity: '', type: 'pcs', expiry: '' });
    setShowAddModal(false);
  };

  const addItemToGrocery = async (name) => {
    await addDoc(groceryCol(), {
      name,
      quantity: '1',
      type: 'pcs',
      createdAt: Date.now()
    });
  };

  const purchaseItem = async (docId) => {
    const purchasedItem = groceryItems.find(i => i.docId === docId);
    await deleteDoc(groceryDoc(docId));

    const existing = fridgeItems.find(item => item.name.toLowerCase() === purchasedItem.name.toLowerCase());
    if (existing) {
      const newQty = parseFloat(existing.quantity || 0) + parseFloat(purchasedItem.quantity || 0);
      const low = isLowStock(existing.name, newQty.toString());
      await updateDoc(fridgeDoc(existing.docId), { quantity: newQty.toString(), lowStock: low });
    } else {
      const low = isLowStock(purchasedItem.name, purchasedItem.quantity);
      await addDoc(fridgeCol(), {
        name: purchasedItem.name,
        quantity: purchasedItem.quantity,
        type: purchasedItem.type,
        expiry: '',
        lowStock: low,
        createdAt: Date.now()
      });
    }
  };

  const deleteFridgeItem = async (docId) => {
    await deleteDoc(fridgeDoc(docId));
  };

  const deleteGroceryItem = async (docId) => {
    await deleteDoc(groceryDoc(docId));
  };

  // Recipe Suggestion Logic (MVP simple keyword matching)
  const recipes = [
    { 
      name: 'Omelette with Spinach', 
      ingredients: ['Eggs', 'Spinach'], 
      steps: 'Whisk eggs, saute spinach, pour eggs over spinach and cook until firm.' 
    },
    { 
      name: 'Creamy Milk Pasta', 
      ingredients: ['Milk', 'Butter', 'Pasta'], 
      steps: 'Boil pasta, make sauce with butter and milk, mix and serve.' 
    },
    { 
      name: 'Simple Salad', 
      ingredients: ['Spinach', 'Tomato', 'Cucumber'], 
      steps: 'Toss spinach with chopped tomato and cucumber. Add light dressing.' 
    }
  ];

  const suggestedRecipes = recipes.filter(recipe => 
    recipe.ingredients.some(ing => 
      fridgeItems.some(item => item.name.toLowerCase().includes(ing.toLowerCase()))
    )
  );

  // Show splash while checking auth
  if (user === undefined) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #fff5f5 0%, #f0fff4 100%)' }}>
        <div style={{ textAlign: 'center', color: '#ff6b6b' }}>
          <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
        </div>
      </div>
    );
  }

  // Show auth screen when not logged in
  if (!user) return <Auth />;

  if (loading) {
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--primary)' }}>
          <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading your kitchen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header style={{ marginBottom: '1.5rem', paddingTop: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ color: 'var(--primary)', marginBottom: '0.1rem', fontSize: '1.8rem' }}>Smart Kitchen</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Hi, {user.displayName || user.email?.split('@')[0]} ✨</p>
          </div>
          <button
            onClick={() => signOut(auth)}
            title="Sign out"
            style={{ background: 'rgba(255,107,107,0.1)', border: 'none', borderRadius: '0.8rem', padding: '0.6rem', cursor: 'pointer', color: '#ff6b6b', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '600', fontSize: '0.85rem', fontFamily: "'Outfit', sans-serif" }}
          >
            <LogOut size={18} /> Sign out
          </button>
        </div>
      </header>

      {/* Stats Quick View */}
      <div className="stats-grid animate">
        <div 
          className={`glass-card ${activeTab === 'fridge' ? 'active-card' : ''}`} 
          style={{ padding: '1rem', textAlign: 'center', cursor: 'pointer', transition: 'all 0.3s' }}
          onClick={() => setActiveTab('fridge')}
        >
          <div style={{ color: 'var(--primary)', marginBottom: '0.3rem' }}><Refrigerator size={20} style={{ margin: '0 auto' }} /></div>
          <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Fridge</h4>
          <p style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{fridgeItems.length}</p>
        </div>
        <div 
          className={`glass-card ${activeTab === 'grocery' ? 'active-card' : ''}`} 
          style={{ padding: '1rem', textAlign: 'center', cursor: 'pointer', transition: 'all 0.3s' }}
          onClick={() => setActiveTab('grocery')}
        >
          <div style={{ color: 'var(--secondary)', marginBottom: '0.3rem' }}><ShoppingCart size={20} style={{ margin: '0 auto' }} /></div>
          <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Grocery</h4>
          <p style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{groceryItems.length}</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'fridge' && (
          <motion.div 
            key="fridge"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.3rem' }}>Fridge Inventory</h2>
              <button 
                className="btn btn-primary" 
                style={{ padding: '0.5rem 1rem', borderRadius: '0.8rem' }}
                onClick={() => setShowAddModal(true)}
              >
                <Plus size={18} /> Add
              </button>
            </div>

            <div className="glass-card" style={{ minHeight: '300px' }}>
              {fridgeItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                  <Refrigerator size={40} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                  <p style={{ color: 'var(--text-muted)' }}>Your fridge is empty. Time to stock up!</p>
                </div>
              ) : (
                fridgeItems.map(item => (
                  <div key={item.docId} className="item-row">
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: '600' }}>{item.name}</h3>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.4rem' }}>
                        <span className="badge" style={{ background: 'rgba(0,0,0,0.04)' }}>{item.quantity} {item.type}</span>
                        {item.expiry && (
                          <span className={`badge ${new Date(item.expiry) < new Date() ? 'badge-expired' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Calendar size={12} /> {item.expiry}
                          </span>
                        )}
                        {item.lowStock && (
                          <span className="badge badge-low" style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <AlertTriangle size={12} /> Low
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      {item.lowStock && (
                        <button 
                          className="btn" 
                          style={{ padding: '0.4rem', background: 'rgba(78, 205, 196, 0.1)', color: 'var(--secondary)' }}
                          title="Add to grocery list"
                          onClick={() => addItemToGrocery(item.name)}
                        >
                          <ShoppingCart size={18} />
                        </button>
                      )}
                      <button 
                        onClick={() => deleteFridgeItem(item.docId)} 
                        style={{ background: 'none', border: 'none', color: '#ff7675', cursor: 'pointer', padding: '0.5rem' }}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'grocery' && (
          <motion.div 
            key="grocery"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="section-header" style={{ marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.3rem' }}>Grocery List</h2>
            </div>

            <div className="glass-card" style={{ padding: '1.2rem', minHeight: '300px' }}>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <input 
                  className="input-field" 
                  placeholder="What else do we need? (e.g. Cheese)" 
                  style={{ marginBottom: 0, flex: 1 }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && e.target.value) {
                      addItemToGrocery(e.target.value);
                      e.target.value = '';
                    }
                  }}
                />
              </div>

              {groceryItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                  <CheckCircle2 size={40} style={{ color: 'var(--secondary)', opacity: 0.3, marginBottom: '1rem' }} />
                  <p style={{ color: 'var(--text-muted)' }}>All items purchased! You're amazing. 🌟</p>
                </div>
              ) : (
                groceryItems.map(item => (
                  <div key={item.docId} className="item-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                      <button 
                        onClick={() => purchaseItem(item.docId)}
                        className="btn-check"
                        style={{ 
                          border: '2px solid var(--secondary)', 
                          borderRadius: '50%', 
                          width: '28px', 
                          height: '28px', 
                          background: 'none', 
                          cursor: 'pointer', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          transition: 'all 0.2s'
                        }}
                      >
                        <ShoppingCart size={14} color="var(--secondary)" />
                      </button>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: '500' }}>{item.name}</h3>
                    </div>
                    <button 
                      onClick={() => deleteGroceryItem(item.docId)}
                      style={{ background: 'none', border: 'none', color: '#ff7675', cursor: 'pointer', padding: '0.5rem' }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))
              )}
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '1rem' }}>
              Tip: Click the cart icon when you buy an item to move it to the fridge!
            </p>
          </motion.div>
        )}

        {activeTab === 'meals' && (
          <motion.div 
            key="meals"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="section-header" style={{ marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.3rem' }}>Recipe Ideas</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Magical meals from your current stock</p>
            </div>

            {suggestedRecipes.length === 0 ? (
              <div className="glass-card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
                <ChefHat size={48} color="var(--primary)" style={{ opacity: 0.2, marginBottom: '1.5rem' }} />
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Not enough items for suggestions yet.</p>
                <button className="btn btn-primary" onClick={() => setActiveTab('fridge')} style={{ margin: '0 auto' }}>
                  Add Fridge Items
                </button>
              </div>
            ) : (
              suggestedRecipes.map((recipe, idx) => (
                <motion.div 
                  key={idx} 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="glass-card" 
                  style={{ borderLeft: '5px solid var(--primary)', padding: '1.2rem' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
                    <h3 style={{ color: 'var(--primary)', fontSize: '1.2rem' }}>{recipe.name}</h3>
                    <Sparkles size={18} color="var(--accent)" />
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {recipe.ingredients.map((ing, i) => (
                        <span key={i} className="badge" style={{ background: 'rgba(78, 205, 196, 0.08)', color: 'var(--secondary)', fontSize: '0.75rem' }}>
                          <CheckCircle2 size={12} style={{ marginRight: '3px' }} /> {ing}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.03)', borderRadius: '1rem', fontSize: '0.9rem', lineHeight: '1.5', color: '#444' }}>
                    {recipe.steps}
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        )}

        {activeTab === 'admin' && user?.email === ADMIN_EMAIL && (
          <AdminPanel />
        )}
      </AnimatePresence>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="glass-card" 
              style={{ width: '100%', maxWidth: '400px', background: 'white', padding: '2rem' }}
            >
              <h2 style={{ marginBottom: '1.5rem', color: 'var(--primary)' }}>New Fridge Item</h2>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', display: 'block' }}>ITEM NAME</label>
                <input 
                  className="input-field" 
                  placeholder="e.g. Greek Yogurt" 
                  value={newItem.name} 
                  autoFocus
                  onChange={e => setNewItem({...newItem, name: e.target.value})}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', display: 'block' }}>QUANTITY</label>
                  <input 
                    className="input-field" 
                    type="number" 
                    value={newItem.quantity} 
                    onChange={e => setNewItem({...newItem, quantity: e.target.value})}
                  />
                </div>
                <div style={{ width: '100px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', display: 'block' }}>UNIT</label>
                  <select 
                    className="input-field" 
                    value={newItem.type}
                    onChange={e => setNewItem({...newItem, type: e.target.value})}
                  >
                    <option value="pcs">pcs</option>
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="L">L</option>
                    <option value="box">box</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: '2rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', display: 'block' }}>EXPIRY DATE (OPTIONAL)</label>
                <input 
                  className="input-field" 
                  type="date" 
                  value={newItem.expiry} 
                  onChange={e => setNewItem({...newItem, expiry: e.target.value})}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="btn btn-primary" style={{ flex: 2 }} onClick={addItemToFridge}>Save Item</button>
                <button className="btn" style={{ flex: 1, background: '#f5f5f5' }} onClick={() => setShowAddModal(false)}>Cancel</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <nav className="nav-bar">
        <button className={`nav-item ${activeTab === 'fridge' ? 'active' : ''}`} onClick={() => setActiveTab('fridge')}>
          <Refrigerator size={24} />
          <span>Fridge</span>
        </button>
        <button className={`nav-item ${activeTab === 'grocery' ? 'active' : ''}`} onClick={() => setActiveTab('grocery')}>
          <ShoppingCart size={24} />
          <span>Grocery</span>
        </button>
        <button className={`nav-item ${activeTab === 'meals' ? 'active' : ''}`} onClick={() => setActiveTab('meals')}>
          <ChefHat size={24} />
          <span>Meals</span>
        </button>
        {user?.email === ADMIN_EMAIL && (
          <button className={`nav-item ${activeTab === 'admin' ? 'active' : ''}`} onClick={() => setActiveTab('admin')}>
            <Shield size={24} />
            <span>Admin</span>
          </button>
        )}
      </nav>
    </div>
  );
}

export default App;
