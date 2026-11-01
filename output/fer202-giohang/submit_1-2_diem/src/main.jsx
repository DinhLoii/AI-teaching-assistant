import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import './style.css';
const products = [{"id": "P01", "name": "Bàn phím", "price": 100000, "stock": 5}, {"id": "P02", "name": "Chuột", "price": 50000, "stock": 10}, {"id": "P03", "name": "Tai nghe", "price": 200000, "stock": 3}];
function Products({onAdd}) {return <section aria-label="Danh sách sản phẩm"><h2>Sản phẩm</h2><div className="products">{products.map(p=><article key={p.id} data-testid={'product-'+p.id}><span className="tag">{p.id}</span><h3>{p.name}</h3><p><span data-testid={'price-'+p.id}>{p.price}</span> ₫</p><small>Còn {p.stock} sản phẩm</small><button data-testid={'add-'+p.id} onClick={()=>onAdd(p)}>Thêm vào giỏ</button></article>)}</div></section>}

function App(){return <main><header><span>FER202 / REACT</span><h1>Cửa hàng phụ kiện</h1><p>Danh sách sản phẩm</p></header><Products onAdd={()=>{}}/><section className="cart" aria-label="Giỏ hàng"><div className="section-title"><h2>Giỏ hàng</h2><button className="secondary" data-testid="clear-cart">Xóa toàn bộ</button></div><p data-testid="cart-empty">Giỏ hàng trống</p><p className="total">Tổng tiền: <strong data-testid="cart-total">0</strong> ₫</p></section></main>}
createRoot(document.getElementById('root')).render(<App/>);
