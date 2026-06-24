export async function x(client: any) {
  return client.from('memory_items').insert({ title: 'x' });
}
