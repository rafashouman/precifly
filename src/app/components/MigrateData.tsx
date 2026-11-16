// components/MigrateData.jsx
'use client';
import { db } from '@/firebase/config';
import { collection, addDoc } from 'firebase/firestore';
import { productsData } from '@/data/products'; // O seu array antigo

export default function MigrateData() {
  const handleMigrate = async () => {
    try {
      const productsCollection = collection(db, 'products');
      
      // Percorre o array e adiciona cada item no banco
      for (const p of productsData) {
        // Limpa o array duplo que estava no seu script original
        const item = Array.isArray(p) ? p[0] : p; 
        
        await addDoc(productsCollection, {
          title: item.title,
          category: item.category,
          price: item.price,
          installments: item.installments,
          image: item.image,
          link: item.link,
          rating: item.rating || "0.0",
          numbersRating: item.numbersRating || "(0)",
          badge: item.badge,
          badgeBg: item.badgeBg,
          badgeColor: item.badgeColor,
        });
      }
      alert('Produtos migrados com sucesso para o Firestore!');
    } catch (error) {
      console.error("Erro ao migrar:", error);
      alert('Erro na migração. Olhe o console.');
    }
  };

  return (
    <button 
      onClick={handleMigrate} 
      style={{ padding: '10px', background: 'red', color: 'white', position: 'fixed', bottom: '10px', left: '10px', zIndex: 9999 }}
    >
      MIGRAR DADOS PARA O FIREBASE
    </button>
  );
}