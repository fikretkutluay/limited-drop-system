import { useProduct } from './hooks/useProduct';
import { ProductCard } from './components/ProductCard';
import { Loader2, AlertCircle } from 'lucide-react';

function App() {
  const { products, loading, error, refetch } = useProduct();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4">
      <div className="max-w-4xl w-full text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
          Exclusive Drop
        </h1>
        <p className="text-gray-500 text-lg">
          Stock is extremely limited. Reserve, buy within 5 minutes, or it goes to the next person!
        </p>
      </div>

      {loading && products.length === 0 ? (
        <div className="flex items-center text-gray-500 gap-2 mt-20">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="font-medium text-lg">Loading Products...</p>
        </div>
      ) : error && products.length === 0 ? (
        <div className="bg-red-50 text-red-600 p-6 rounded-xl flex items-center gap-3 mt-20">
          <AlertCircle className="w-8 h-8" />
          <p className="font-bold">{error}</p>
        </div>
      ) : (
        <div className="flex flex-wrap justify-center gap-8 w-full max-w-6xl">
          {products.map((product) => (
            <ProductCard 
              key={product.id} 
              product={product} 
              onReservationSuccess={refetch}
            />
          ))}
          {products.length === 0 && !loading && (
            <p className="text-gray-500 mt-20 text-lg font-medium">No active product drops at the moment.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default App;