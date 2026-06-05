-- Creăm un bucket privat pentru stocarea fizică a PDF-urilor
insert into storage.buckets (id, name, public) 
values ('documents', 'documents', false) 
on conflict (id) do nothing;
