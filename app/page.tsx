export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-3xl text-canyon">Recipe book</h1>
      <div className="mt-4 flex gap-3">
        <div className="h-16 w-16 rounded-xl bg-canyon" />
        <div className="h-16 w-16 rounded-xl bg-buttercream" />
        <div className="h-16 w-16 rounded-xl bg-sky" />
        <div className="h-16 w-16 rounded-xl bg-olive" />
      </div>
      <p className="mt-4 font-body">Nunito body text renders here.</p>
    </main>
  );
}
