-- Creăm un bucket public pentru stocarea fizică a bannerelor/imaginilor
insert into storage.buckets (id, name, public) 
values ('images', 'images', true) 
on conflict (id) do nothing;
