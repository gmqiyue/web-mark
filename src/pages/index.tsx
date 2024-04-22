import { Tabs } from 'antd';
import { useEffect, useRef } from 'react';
import DocSection from './components/DocSection';
import DocSection2 from './components/DocSection2';
import ExampleTable from './components/ExampleTable';
import HelloUmi from './components/HelloUmi';

import WebMark from '@/lib/web-mark';

import markData from './markData.json';

import '@/lib/web-mark/styles.css';
import './index.less';

export default function HomePage() {
  const webmarkContainer = useRef<HTMLDivElement>(null);
  const webmarkInstance = useRef<WebMark>();

  useEffect(() => {
    if (!webmarkContainer.current) return;

    webmarkInstance.current = new WebMark(webmarkContainer.current, {
      // onMarkClick(event) {
      //   (event.target as HTMLElement).classList.add('')
      //     console.log(event)
      // },
    });

    webmarkInstance.current.hilightMarkwordByCharacterOffsets(markData);

    return () => {
      webmarkInstance.current?.destroy();
    };
  }, [webmarkContainer]);

  return (
    <div className="o-page" ref={webmarkContainer}>
      <Tabs
        items={[
          {
            key: 'tab1',
            label: 'Tab1',
            children: (
              <div className="tab1-content tab-content">
                <HelloUmi data-webmark-id="tab1-HelloUmi" />
                <DocSection data-webmark-id="tab1-DocSection" />
              </div>
            ),
          },
          {
            key: 'tab2',
            label: 'Tab2',
            children: (
              <div className="tab2-content tab-content">
                <HelloUmi data-webmark-id="tab2-HelloUmi" />
                <DocSection2 data-webmark-id="tab2-DocSection2" />
                <ExampleTable data-webmark-id="tab2-ExampleTable" />
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
