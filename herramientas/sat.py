# Baja teselas satelitales (Esri World Imagery) alrededor del estadio. uso: python3 -I sat.py zoom radio
import math,urllib.request,sys,os,time
lat,lon,z,R=4.6234,-74.1354,int(sys.argv[1]),int(sys.argv[2])
n=2**z; x=(lon+180)/360*n; y=(1-math.log(math.tan(math.radians(lat))+1/math.cos(math.radians(lat)))/math.pi)/2*n
cx,cy=int(x),int(y)
for dy in range(-R,R+1):
  for dx in range(-R,R+1):
    f=f"t_{z}_{dy+R}_{dx+R}.jpg"
    if os.path.exists(f) and os.path.getsize(f)>1000: continue
    u=f"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{cy+dy}/{cx+dx}"
    for intento in range(4):
      try:
        req=urllib.request.Request(u,headers={'User-Agent':'map-research-client/1.0'})
        open(f,"wb").write(urllib.request.urlopen(req,timeout=30).read()); break
      except Exception as e:
        print('reintento',f,e); time.sleep(2+intento*3)
