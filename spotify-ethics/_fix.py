import pathlib

f = pathlib.Path('src/App.tsx')
content = f.read_text('utf-8')

# Fix the broken escape line
bad = 'xe2x80x93 ikkje kva artisten faktisk mottek. Inntektene frxc3xa5 streaming gxc3xa5r til heile'
good = '\u2013 ikkje kva artisten faktisk mottek. Inntektene fr\u00e5 streaming g\u00e5r til heile'
content = content.replace(bad, good)

bad2 = 'distributxc3xb8rar, produsentar, studiomusikerar, miks- og masteringteknikarar og andre rettshavarar. Det reelle belxc3xb8pet som nxc3xa5r fram til songskrivaren eller utxc3xb8varen er i praksis ein brxc3xb8kdel av bruttotalet. Dette inneber ogsxc3xa5 at systemet xc3xb8konomisk favoriserer musikk som kan lagast med fxc3xa5 medverkande, sidan tradisjonell produksjon med mange involverte fxc3xb8rer til at kvar enkelt mottek ein stadig mindre del av ein allereie lxc3xa5g sum.'
good2 = 'distribut\u00f8rar, produsentar, studiomusikerar, miks- og masteringteknikarar og andre rettshavarar. Det reelle bel\u00f8pet som n\u00e5r fram til songskrivaren eller ut\u00f8varen er i praksis ein br\u00f8kdel av bruttotalet. Dette inneber ogs\u00e5 at systemet \u00f8konomisk favoriserer musikk som kan lagast med f\u00e5 medverkande, sidan tradisjonell produksjon med mange involverte f\u00f8rer til at kvar enkelt mottek ein stadig mindre del av ein allereie l\u00e5g sum.'
content = content.replace(bad2, good2)

f.write_text(content, 'utf-8')
print('done')
