
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Sparkles, Plus, Heart, UserPlus, Check, ShoppingBag, MessageCircle,
  Camera, X, Loader2, Terminal, Cpu, Download, Info, Calendar, Layers,
  ShieldCheck, Star, Trash2, Edit3, BarChart3, TrendingUp, Award, FileUp, ShieldAlert, AlertCircle
} from 'lucide-react';
import { Product, UserProfile, ZenjTool } from '../types';
import { dbQuery, dbRun } from '../services/database';
import { useNotification } from './NotificationProvider';

interface MarketplaceViewProps {
  userProfile: UserProfile;
  onCheckInStore: (sellerId: string, sellerName: string, sellerAvatar: string) => void;
}

const MarketplaceView: React.FC<MarketplaceViewProps> = ({ userProfile, onCheckInStore }) => {
  const { confirm } = useNotification();
  const [activeTab, setActiveTab] = useState<'marketplace' | 'software' | 'business' | 'dev-lab'>('marketplace');
  const [products, setProducts] = useState<Product[]>([]);
  const [tools, setTools] = useState<ZenjTool[]>([]);
  const [isPosting, setIsPosting] = useState<Product | boolean>(false);
  const [loading, setLoading] = useState(true);
  const [selectedTool, setSelectedTool] = useState<ZenjTool | null>(null);
  const [toolDetailsModal, setToolDetailsModal] = useState<ZenjTool | null>(null);

  // Tool Creation State (Dev Lab)
  const [isManifestingTool, setIsManifestingTool] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [newTool, setNewTool] = useState({ name: '', description: '', version: '1.0.0', icon: '', file: '', fileName: '' });
  const iconInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdminOrBusiness = userProfile.role === 'admin' || userProfile.accountType === 'business';

  const loadData = async () => {
    setLoading(true);
    const [prodRows, toolRows] = await Promise.all([
      dbQuery("SELECT * FROM products ORDER BY timestamp DESC"),
      dbQuery("SELECT * FROM tools ORDER BY timestamp DESC")
    ]);
    setProducts(prodRows as Product[]);
    setTools(toolRows as ZenjTool[]);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const businessStats = useMemo(() => {
    const myProds = products.filter(p => p.sellerId === userProfile.id);
    const totalLikes = myProds.reduce((acc, p) => acc + (p.likes || 0), 0);
    const avgRating = myProds.length ? (myProds.reduce((acc, p) => acc + (p.rating || 0), 0) / myProds.length).toFixed(1) : '5.0';
    return { count: myProds.length, likes: totalLikes, rating: avgRating };
  }, [products, userProfile.id]);

  const handlePostTool = async () => {
    if (!newTool.name || !newTool.file || !newTool.icon) return;
    setUploadProgress(10);
    setIsManifestingTool(true);
    
    // Simulate Upload
    let p = 10;
    const interval = setInterval(() => {
      p += 15;
      setUploadProgress(Math.min(p, 90));
      if (p >= 100) {
        clearInterval(interval);
        completeToolManifest();
      }
    }, 200);
  };

  const completeToolManifest = async () => {
    const id = `tool-${Date.now()}`;
    await dbRun("INSERT INTO tools (id, name, description, version, iconUrl, fileUrl, fileName, timestamp, downloads) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [
      id, newTool.name, newTool.description, newTool.version, newTool.icon, newTool.file, newTool.fileName, Date.now(), 0
    ]);
    setUploadProgress(100);
    setTimeout(() => {
      setIsManifestingTool(false);
      setUploadProgress(0);
      setNewTool({ name: '', description: '', version: '1.0.0', icon: '', file: '', fileName: '' });
      setActiveTab('software');
      loadData();
    }, 800);
  };

  // --- Fix: Added handleDelete function for manifestations ---
  const handleDelete = async (productId: string) => {
    if (!(await confirm("Remove this manifestation from existence?"))) return;
    // Assuming server endpoint handles DELETE by productId through dbRun wrapper logic
    await dbRun("DELETE FROM products WHERE id = ?", [productId]);
    loadData();
  };

  // --- Fix: Added handleLike function for products ---
  const handleLike = async (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const isLiked = !product.isLiked;
    const likes = isLiked ? (product.likes || 0) + 1 : Math.max(0, (product.likes || 0) - 1);
    
    // Optimistic UI update for immediate feedback
    setProducts(products.map(p => p.id === productId ? { ...p, isLiked, likes } : p));
    
    await dbRun("UPDATE products SET likes = ? WHERE id = ?", [likes, productId]);
  };

  const handlePostItem = async () => {
    if (!newProduct.title || !newProduct.image) return;
    const isEdit = typeof isPosting === 'object';
    const id = isEdit ? (isPosting as Product).id : `prod-${Date.now()}`;
    const payload = {
      id, sellerId: userProfile.id, sellerName: userProfile.name, sellerAvatar: userProfile.avatar, 
      title: newProduct.title, description: newProduct.description, price: newProduct.price, 
      imageUrl: newProduct.image, timestamp: Date.now(), likes: isEdit ? (isPosting as Product).likes : 0,
      rating: isEdit ? (isPosting as Product).rating : 5.0, ratingCount: isEdit ? (isPosting as Product).ratingCount : 0
    };
    await dbRun("INSERT INTO products (id, sellerId, sellerName, sellerAvatar, title, description, price, imageUrl, timestamp, likes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
      payload.id, payload.sellerId, payload.sellerName, payload.sellerAvatar, payload.title, payload.description, payload.price, payload.imageUrl, payload.timestamp, payload.likes
    ]);
    setIsPosting(false);
    setNewProduct({ title: '', description: '', price: '', image: '' });
    loadData();
  };

  const [newProduct, setNewProduct] = useState({ title: '', description: '', price: '', image: '' });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b141a] overflow-hidden">
      <header className="h-[70px] md:h-[100px] bg-[#202c33] flex items-center justify-between px-6 md:px-12 gap-4 shrink-0 shadow-lg relative z-10">
        <div className="flex items-center gap-6">
           <div className="flex items-center gap-3">
              <ShoppingBag className="text-[#00a884]" size={28} />
              <h2 className="text-white text-2xl font-bold font-outfit hidden sm:block">Zen Space</h2>
           </div>
           <div className="flex bg-[#111b21] rounded-[20px] p-1 border border-white/5 overflow-x-auto no-scrollbar max-w-[400px]">
              <button onClick={() => setActiveTab('marketplace')} className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${activeTab === 'marketplace' ? 'bg-[#00a884] text-black' : 'text-[#8696a0]'}`}>Market</button>
              <button onClick={() => setActiveTab('software')} className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${activeTab === 'software' ? 'bg-[#00a884] text-black' : 'text-[#8696a0]'}`}>Software</button>
              {isAdminOrBusiness && (
                <button onClick={() => setActiveTab('dev-lab')} className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${activeTab === 'dev-lab' ? 'bg-amber-500 text-black' : 'text-[#8696a0]'}`}>Dev Lab</button>
              )}
              {userProfile.accountType === 'business' && (
                <button onClick={() => setActiveTab('business')} className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${activeTab === 'business' ? 'bg-[#00a884] text-black' : 'text-[#8696a0]'}`}>Stats</button>
              )}
           </div>
        </div>
        <button onClick={() => setIsPosting(true)} className="p-3 bg-[#00a884] text-black rounded-2xl hover:bg-[#06cf9c] transition-all flex items-center gap-2 font-bold text-sm shadow-xl shadow-[#00a884]/20"><Plus size={20} /><span className="hidden sm:inline">Manifest</span></button>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar p-6 md:p-12">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'dev-lab' ? (
            <div className="space-y-10 animate-in fade-in duration-500 pb-20 max-w-2xl mx-auto">
               <div className="text-center space-y-2">
                  <Cpu className="mx-auto text-amber-500" size={48} />
                  <h3 className="text-2xl font-bold text-white font-outfit">Software Forge</h3>
                  <p className="text-[#8696a0] text-sm font-medium">Manifest technical tools for the Zenj community.</p>
               </div>

               <div className="bg-[#111b21] rounded-[48px] p-8 border border-amber-500/20 shadow-2xl space-y-6">
                  {uploadProgress > 0 ? (
                    <div className="py-20 flex flex-col items-center gap-6">
                       <Loader2 className="animate-spin text-amber-500" size={48} />
                       <div className="w-full h-2 bg-[#0b141a] rounded-full overflow-hidden max-w-[300px]">
                          <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                       </div>
                       <p className="text-amber-500 font-black uppercase tracking-widest text-[10px]">Synchronizing Manifest...</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-6">
                         <div onClick={() => iconInputRef.current?.click()} className="w-24 h-24 bg-[#0b141a] rounded-[32px] border border-white/5 flex items-center justify-center cursor-pointer group shrink-0 relative overflow-hidden">
                            {newTool.icon ? <img src={newTool.icon} className="w-full h-full object-cover" alt="" /> : <Camera size={32} className="text-[#3b4a54] group-hover:text-amber-500" />}
                            <input type="file" ref={iconInputRef} onChange={(e) => { const f = e.target.files?.[0]; if(f) { const r = new FileReader(); r.onloadend = () => setNewTool({...newTool, icon: r.result as string}); r.readAsDataURL(f); } }} accept="image/*" className="hidden" />
                         </div>
                         <div className="flex-1 space-y-4">
                            <input type="text" placeholder="Tool Identity" value={newTool.name} onChange={(e) => setNewTool({...newTool, name: e.target.value})} className="w-full bg-[#0b141a] border border-white/5 rounded-2xl py-3 px-5 text-white font-bold outline-none focus:border-amber-500/50" />
                            <input type="text" placeholder="Version (1.0.0)" value={newTool.version} onChange={(e) => setNewTool({...newTool, version: e.target.value})} className="w-full bg-[#0b141a] border border-white/5 rounded-2xl py-3 px-5 text-amber-500 font-mono text-xs outline-none focus:border-amber-500/50" />
                         </div>
                      </div>
                      <div onClick={() => fileInputRef.current?.click()} className="w-full py-10 bg-[#0b141a] border-2 border-dashed border-amber-500/20 hover:border-amber-500/50 rounded-[32px] flex flex-col items-center justify-center gap-3 cursor-pointer group transition-all">
                         {newTool.file ? <div className="flex flex-col items-center text-amber-500"><ShieldCheck size={40} /><span className="text-[10px] font-bold mt-2 uppercase">{newTool.fileName}</span></div> : <><FileUp size={40} className="text-[#3b4a54] group-hover:text-amber-500" /><span className="text-[10px] font-bold text-[#8696a0] uppercase tracking-widest">Upload Bundle</span></>}
                         <input type="file" ref={fileInputRef} onChange={(e) => { const f = e.target.files?.[0]; if(f) { const r = new FileReader(); r.onloadend = () => setNewTool({...newTool, file: r.result as string, fileName: f.name}); r.readAsDataURL(f); } }} className="hidden" />
                      </div>
                      <textarea placeholder="Technical description of this software manifestation..." value={newTool.description} onChange={(e) => setNewTool({...newTool, description: e.target.value})} className="w-full h-24 bg-[#0b141a] border border-white/5 rounded-2xl py-4 px-6 text-[#d1d7db] outline-none resize-none text-sm" />
                      <button onClick={handlePostTool} disabled={!newTool.name || !newTool.file || !newTool.icon} className="w-full bg-amber-500 text-black py-5 rounded-[28px] font-black text-lg shadow-2xl shadow-amber-500/30 transition-all disabled:opacity-50">Forge Software</button>
                    </>
                  )}
               </div>
            </div>
          ) : activeTab === 'business' ? (
            <div className="space-y-10 animate-in fade-in duration-500 pb-20">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-[#111b21] p-8 rounded-[40px] border border-white/5 shadow-2xl space-y-2">
                     <TrendingUp className="text-[#00a884]" size={32} />
                     <p className="text-[#8696a0] text-xs font-black uppercase tracking-widest">Active Manifestations</p>
                     <p className="text-4xl font-bold text-white font-outfit">{businessStats.count}</p>
                  </div>
                  <div className="bg-[#111b21] p-8 rounded-[40px] border border-white/5 shadow-2xl space-y-2">
                     <Heart className="text-rose-500" size={32} />
                     <p className="text-[#8696a0] text-xs font-black uppercase tracking-widest">Interaction Pulse</p>
                     <p className="text-4xl font-bold text-white font-outfit">{businessStats.likes}</p>
                  </div>
                  <div className="bg-[#111b21] p-8 rounded-[40px] border border-white/5 shadow-2xl space-y-2">
                     <Award className="text-amber-500" size={32} />
                     <p className="text-[#8696a0] text-xs font-black uppercase tracking-widest">Trust Index</p>
                     <p className="text-4xl font-bold text-white font-outfit">{businessStats.rating} <span className="text-lg text-amber-500">★</span></p>
                  </div>
               </div>
               <h3 className="text-white text-xl font-bold font-outfit flex items-center gap-3 px-2 pt-6"><BarChart3 className="text-[#00a884]" /> Manifestations</h3>
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {products.filter(p => p.sellerId === userProfile.id).map(product => (
                    <div key={product.id} className="bg-[#111b21] rounded-[48px] overflow-hidden border border-white/5 shadow-2xl relative group">
                       <img src={product.imageUrl} className="w-full aspect-square object-cover opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-700" alt="" />
                       <div className="p-6">
                          <h4 className="text-white font-bold text-lg font-outfit truncate">{product.title}</h4>
                          <div className="flex gap-2 mt-4">
                             <button onClick={() => { setIsPosting(product); setNewProduct({ title: product.title, description: product.description, price: product.price, image: product.imageUrl }); }} className="flex-1 py-3 bg-white/5 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#00a884] hover:text-black transition-all"><Edit3 size={18} /> Edit</button>
                             <button onClick={() => handleDelete(product.id)} className="flex-1 py-3 bg-rose-500/10 text-rose-500 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-rose-500 hover:text-white transition-all"><Trash2 size={18} /> Delete</button>
                          </div>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          ) : activeTab === 'marketplace' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
              {products.map(product => (
                <div key={product.id} className="bg-[#111b21] rounded-[48px] overflow-hidden border border-white/5 shadow-2xl transition-all hover:border-[#00a884]/30">
                  <div className="aspect-square relative overflow-hidden bg-black/40"><img src={product.imageUrl} className="w-full h-full object-cover" alt="" />
                    <div className="absolute top-4 right-4 flex flex-col gap-2">
                       <button onClick={() => handleLike(product.id)} className={`p-3 rounded-full backdrop-blur-md border border-white/10 transition-all ${product.isLiked ? 'bg-rose-500 text-white shadow-lg' : 'bg-black/40 text-white hover:bg-black/60'}`}><Heart size={20} fill={product.isLiked ? 'currentColor' : 'none'} /></button>
                    </div>
                  </div>
                  <div className="p-6 space-y-4">
                    <h4 className="text-xl font-bold text-white font-outfit truncate">{product.title}</h4>
                    <p className="text-[#8696a0] text-sm line-clamp-2">{product.description}</p>
                    <div className="flex justify-between items-center pt-2">
                       <span className="text-[#00a884] font-bold text-xl font-outfit">{product.price || 'Zen'}</span>
                       <button onClick={() => onCheckInStore(product.sellerId, product.sellerName, product.sellerAvatar)} className="px-6 py-3 bg-[#00a884]/10 text-[#00a884] rounded-2xl font-bold flex items-center gap-2 transition-all hover:bg-[#00a884] hover:text-black border border-[#00a884]/20"><MessageCircle size={18} /> Connect</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
               {tools.map(tool => (
                 <div key={tool.id} className="bg-[#111b21] rounded-[48px] border border-white/5 p-8 shadow-2xl group relative overflow-hidden">
                    <div className="flex items-center gap-4 mb-6">
                       <img src={tool.iconUrl} className="w-16 h-16 rounded-[24px] border border-white/10" alt="" />
                       <div><h4 className="text-white font-bold text-lg font-outfit">{tool.name}</h4><span className="text-[10px] font-mono text-[#00a884] bg-[#00a884]/10 px-2 py-0.5 rounded">{tool.version}</span></div>
                    </div>
                    <p className="text-[#8696a0] text-sm mb-8 h-20 line-clamp-3">{tool.description}</p>
                    <button onClick={() => setToolDetailsModal(tool)} className="w-full py-4 bg-[#00a884] text-black rounded-3xl font-black shadow-xl shadow-[#00a884]/20"><Info size={20} className="inline mr-2" /> View Details</button>
                 </div>
               ))}
            </div>
          )}
        </div>
      </div>

      {isPosting && (
        <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col p-6 animate-in slide-in-from-bottom duration-300">
          <div className="flex justify-between items-center mb-6 max-w-lg mx-auto w-full">
            <button onClick={() => setIsPosting(false)} className="text-[#8696a0] hover:text-white p-2 bg-white/5 rounded-full"><X size={28} /></button>
            <h3 className="text-white text-xl font-bold font-outfit">{typeof isPosting === 'object' ? 'Edit Manifestation' : 'New Manifestation'}</h3>
            <div className="w-10"></div>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full overflow-y-auto no-scrollbar pb-10">
            <div className="w-full bg-[#202c33] rounded-[48px] p-8 shadow-2xl border border-white/10 space-y-6">
              <div onClick={() => document.getElementById('item-image')?.click()} className="relative aspect-square w-full rounded-[36px] bg-[#0b141a] border border-white/5 overflow-hidden flex flex-col items-center justify-center shadow-inner cursor-pointer group">
                {newProduct.image ? <img src={newProduct.image} alt="Preview" className="w-full h-full object-cover" /> : <div className="flex flex-col items-center gap-3 text-[#3b4a54] group-hover:text-[#00a884] transition-colors"><Camera size={56} strokeWidth={1.5} /><span className="text-sm font-bold uppercase tracking-widest">Image Source</span></div>}
                <input type="file" id="item-image" onChange={(e) => { const f = e.target.files?.[0]; if(f) { const r = new FileReader(); r.onloadend = () => setNewProduct({...newProduct, image: r.result as string}); r.readAsDataURL(f); } }} accept="image/*" className="hidden" />
              </div>
              <div className="space-y-4">
                <input type="text" placeholder="Manifest Title" value={newProduct.title} onChange={(e) => setNewProduct({...newProduct, title: e.target.value})} className="w-full bg-[#111b21] border border-white/5 rounded-2xl py-4 px-6 text-white text-lg font-bold placeholder-[#3b4a54] outline-none" />
                <input type="text" placeholder="Zen Energy / Price" value={newProduct.price} onChange={(e) => setNewProduct({...newProduct, price: e.target.value})} className="w-full bg-[#111b21] border border-white/5 rounded-2xl py-4 px-6 text-[#00a884] font-bold placeholder-[#3b4a54] outline-none" />
                <textarea placeholder="Manifest description..." value={newProduct.description} onChange={(e) => setNewProduct({...newProduct, description: e.target.value})} className="w-full h-24 bg-[#111b21] border border-white/5 rounded-2xl py-4 px-6 text-[#d1d7db] outline-none resize-none" />
              </div>
              <button onClick={handlePostItem} className="w-full bg-[#00a884] text-black py-5 rounded-3xl font-black text-lg shadow-2xl shadow-[#00a884]/20 transition-all">Synchronize Manifestation</button>
            </div>
          </div>
        </div>
      )}

      {toolDetailsModal && (
        <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col p-6 animate-in slide-in-from-bottom duration-300">
          <div className="flex justify-between items-center mb-6 max-w-lg mx-auto w-full">
            <button onClick={() => setToolDetailsModal(null)} className="text-[#8696a0] hover:text-white p-2 bg-white/5 rounded-full"><X size={28} /></button>
            <h3 className="text-white text-xl font-bold font-outfit">Tool Details</h3>
            <div className="w-10"></div>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full overflow-y-auto no-scrollbar pb-10">
            <div className="w-full bg-[#202c33] rounded-[48px] p-8 shadow-2xl border border-white/10 space-y-6">
              <div className="flex items-center gap-4">
                <img src={toolDetailsModal.iconUrl} className="w-16 h-16 rounded-[24px] border border-white/10" alt="" />
                <div>
                  <h4 className="text-white font-bold text-xl font-outfit">{toolDetailsModal.name}</h4>
                  <span className="text-[10px] font-mono text-[#00a884] bg-[#00a884]/10 px-2 py-0.5 rounded">{toolDetailsModal.version}</span>
                </div>
              </div>
              <div>
                <h5 className="text-[#8696a0] text-sm font-bold uppercase tracking-widest mb-2">Description</h5>
                <p className="text-[#d1d7db] text-sm">{toolDetailsModal.description}</p>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#8696a0] text-sm">Downloads: {toolDetailsModal.downloads || 0}</span>
                <span className="text-[#8696a0] text-sm">Size: {toolDetailsModal.fileSize || 'Unknown'}</span>
              </div>
              <button className="w-full bg-[#00a884] text-black py-4 rounded-3xl font-black shadow-xl shadow-[#00a884]/20"><Download size={20} className="inline mr-2" /> Download Tool</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketplaceView;
