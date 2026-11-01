import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import './style.css';
const products = [{"id": "P01", "name": "Bàn phím", "price": 100000, "stock": 5}, {"id": "P02", "name": "Chuột", "price": 50000, "stock": 10}, {"id": "P03", "name": "Tai nghe", "price": 200000, "stock": 3}];
function Products({onAdd}) {return <section aria-label="Danh sách sản phẩm"><h2>Sản phẩm</h2><div className="products">{products.map(p=><article key={p.id} data-testid={'product-'+p.id}><span className="tag">{p.id}</span><h3>{p.name}</h3><p><span data-testid={'price-'+p.id}>{p.price}</span> ₫</p><small>Còn {p.stock} sản phẩm</small><button data-testid={'add-'+p.id} onClick={()=>onAdd(p)}>Thêm vào giỏ</button></article>)}</div></section>}

function Cart({cart,onQuantity,onRemove,onClear}) {
 const total=cart.reduce((s,p)=>s+p.price*p.quantity,0);
 return <section className="cart" aria-label="Giỏ hàng"><div className="section-title"><h2>Giỏ hàng</h2><button className="secondary" data-testid="clear-cart" onClick={onClear}>Xóa toàn bộ</button></div>
 {!cart.length&&<p data-testid="cart-empty">Giỏ hàng trống</p>}
 {cart.map(p=><article className="cart-row" key={p.id} data-testid={'cart-row-'+p.id}><div><strong>{p.name}</strong><p>{p.price} ₫ / sản phẩm</p></div><label>Số lượng<input type="number" min="1" max={p.stock} value={p.quantity} data-testid={'quantity-'+p.id} onChange={e=>onQuantity(p.id,e.target.value)}/></label><div><span data-testid={'line-total-'+p.id}>{p.price*p.quantity}</span> ₫</div><button className="secondary" data-testid={'remove-'+p.id} onClick={()=>onRemove(p.id)}>Xóa</button></article>)}
 <p className="total">Tổng tiền: <strong data-testid="cart-total">{total}</strong> ₫</p></section>;
}
function App() {
 const [cart,setCart]=useState([]),[error,setError]=useState('');
 function add(product) {
  const existing=cart.find(p=>p.id===product.id);
  if(existing&&existing.quantity>=product.stock){setError('Không đủ hàng trong kho.');return;}
  setError('');setCart(existing?cart.map(p=>p.id===product.id?{...p,quantity:p.quantity+1}:p):[...cart,{...product,quantity:1}]);
 }
 function quantity(id,value){const p=cart.find(p=>p.id===id);const q=Number(value);if(!Number.isInteger(q)||q<1||q>p.stock){setError('Số lượng phải từ 1 đến tồn kho.');return;}setError('');setCart(cart.map(p=>p.id===id?{...p,quantity:q}:p));}
 return <main><header><span>FER202 / REACT</span><h1>Cửa hàng phụ kiện</h1><p>Chọn sản phẩm và quản lý giỏ hàng của bạn.</p></header><Products onAdd={add}/>{error&&<p className="error" role="alert" data-testid="cart-error">{error}</p>}<Cart cart={cart} onQuantity={quantity} onRemove={id=>{setCart(cart.filter(p=>p.id!==id));setError('');}} onClear={()=>{setCart([]);setError('');}}/></main>;
}
createRoot(document.getElementById('root')).render(<App/>);
